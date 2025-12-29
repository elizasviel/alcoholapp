import { NextRequest, NextResponse } from 'next/server';
import { extractLabelData } from '@/lib/gemini';
import { verifyLabel } from '@/lib/verification';
import { ApplicationData, VerificationResult, BatchVerificationJob } from '@/types';
import { v4 as uuidv4 } from 'uuid';

export const maxDuration = 60; // Allow up to 60 seconds for batch processing

interface BatchVerifyRequest {
  labels: Array<{
    id: string;
    labelImage: string; // Base64 encoded image
    mimeType: string;
    applicationData: ApplicationData;
  }>;
}

interface BatchResult {
  id: string;
  result?: VerificationResult;
  error?: string;
}

// Process labels concurrently but with rate limiting
async function processWithConcurrency<T, R>(
  items: T[],
  processor: (item: T) => Promise<R>,
  concurrency: number = 5
): Promise<R[]> {
  const results: R[] = [];
  const executing: Promise<void>[] = [];
  
  for (const item of items) {
    const promise = processor(item).then(result => {
      results.push(result);
    });
    
    executing.push(promise);
    
    if (executing.length >= concurrency) {
      await Promise.race(executing);
      // Remove completed promises
      const completedIndex = executing.findIndex(p => 
        Promise.race([p, Promise.resolve('pending')]).then(r => r !== 'pending')
      );
      if (completedIndex >= 0) {
        executing.splice(completedIndex, 1);
      }
    }
  }
  
  await Promise.all(executing);
  return results;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const jobStartTime = Date.now();
  const jobId = uuidv4();
  
  try {
    const body: BatchVerifyRequest = await request.json();
    
    if (!body.labels || !Array.isArray(body.labels)) {
      return NextResponse.json(
        { error: 'Invalid request: labels array required' },
        { status: 400 }
      );
    }
    
    if (body.labels.length === 0) {
      return NextResponse.json(
        { error: 'No labels provided' },
        { status: 400 }
      );
    }
    
    // Limit batch size to prevent timeout
    const MAX_BATCH_SIZE = 50;
    if (body.labels.length > MAX_BATCH_SIZE) {
      return NextResponse.json(
        { error: `Batch size exceeds maximum of ${MAX_BATCH_SIZE}. Please split into smaller batches.` },
        { status: 400 }
      );
    }
    
    console.log(`Starting batch verification job ${jobId} with ${body.labels.length} labels`);
    
    const results: BatchResult[] = [];
    const errors: string[] = [];
    
    // Process labels with concurrency control
    await processWithConcurrency(
      body.labels,
      async (label) => {
        const labelStartTime = Date.now();
        
        try {
          // Extract label data
          const extractedData = await extractLabelData(
            label.labelImage,
            label.mimeType || 'image/jpeg'
          );
          
          // Verify against application data
          const verificationResult = verifyLabel(
            label.applicationData,
            extractedData,
            Date.now() - labelStartTime
          );
          
          results.push({
            id: label.id,
            result: verificationResult
          });
          
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          console.error(`Error processing label ${label.id}:`, errorMessage);
          
          results.push({
            id: label.id,
            error: errorMessage
          });
          
          errors.push(`Label ${label.id}: ${errorMessage}`);
        }
      },
      5 // Process 5 labels concurrently
    );
    
    const totalTime = Date.now() - jobStartTime;
    const avgTimePerLabel = totalTime / body.labels.length;
    
    console.log(`Batch job ${jobId} completed in ${totalTime}ms (avg ${avgTimePerLabel.toFixed(0)}ms per label)`);
    
    const job: BatchVerificationJob = {
      id: jobId,
      status: errors.length === body.labels.length ? 'failed' : 'completed',
      totalLabels: body.labels.length,
      processedLabels: results.filter(r => r.result).length,
      results: results.filter(r => r.result).map(r => r.result!),
      startTime: new Date(jobStartTime).toISOString(),
      endTime: new Date().toISOString(),
      errors
    };
    
    // Calculate summary statistics
    const approved = results.filter(r => r.result?.status === 'approved').length;
    const rejected = results.filter(r => r.result?.status === 'rejected').length;
    const needsReview = results.filter(r => r.result?.status === 'needs_review').length;
    const failed = results.filter(r => r.error).length;
    
    return NextResponse.json({
      success: true,
      job,
      summary: {
        total: body.labels.length,
        approved,
        rejected,
        needsReview,
        failed,
        processingTimeMs: totalTime,
        avgTimePerLabelMs: avgTimePerLabel
      }
    });
    
  } catch (error) {
    console.error('Batch verification error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return NextResponse.json(
      { 
        success: false,
        error: errorMessage,
        processingTime: Date.now() - jobStartTime
      },
      { status: 500 }
    );
  }
}

