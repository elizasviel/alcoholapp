import { NextRequest, NextResponse } from 'next/server';
import { extractLabelData } from '@/lib/gemini';
import { verifyLabel } from '@/lib/verification';
import { ApplicationData } from '@/types';

export const maxDuration = 30; // Allow up to 30 seconds for processing

interface VerifyRequest {
  labelImage: string; // Base64 encoded image
  mimeType: string;
  applicationData: ApplicationData;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const startTime = Date.now();
  
  try {
    const body: VerifyRequest = await request.json();
    
    // Validate request
    if (!body.labelImage) {
      return NextResponse.json(
        { error: 'Missing label image' },
        { status: 400 }
      );
    }
    
    if (!body.applicationData) {
      return NextResponse.json(
        { error: 'Missing application data' },
        { status: 400 }
      );
    }
    
    // Extract label data using Gemini 2.5 Flash-Lite
    const extractedData = await extractLabelData(
      body.labelImage,
      body.mimeType || 'image/jpeg'
    );
    
    const extractionTime = Date.now() - startTime;
    
    // Verify label against application data
    const verificationResult = verifyLabel(
      body.applicationData,
      extractedData,
      extractionTime
    );
    
    const totalTime = Date.now() - startTime;
    
    console.log(`Total verification completed in ${totalTime}ms`);
    
    // Check if we're within the <5 second target
    if (totalTime > 5000) {
      console.warn(`Verification exceeded 5 second target: ${totalTime}ms`);
    }
    
    return NextResponse.json({
      success: true,
      result: verificationResult,
      processingTime: totalTime
    });
    
  } catch (error) {
    console.error('Verification error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return NextResponse.json(
      { 
        success: false,
        error: errorMessage,
        processingTime: Date.now() - startTime
      },
      { status: 500 }
    );
  }
}

// Health check endpoint
export async function GET(): Promise<NextResponse> {
  return NextResponse.json({
    status: 'healthy',
    service: 'TTB Label Verification API',
    version: '1.0.0'
  });
}

