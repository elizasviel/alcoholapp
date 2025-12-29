'use client';

import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { ApplicationData, VerificationResult, BeverageType } from '@/types';
import { 
  X, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle,
  Loader2,
  FileSpreadsheet,
  Download,
  RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface BatchItem {
  id: string;
  file: File;
  preview: string;
  applicationData: ApplicationData;
  status: 'pending' | 'processing' | 'completed' | 'error';
  result?: VerificationResult;
  error?: string;
}

interface BatchUploadProps {
  onComplete?: (results: VerificationResult[]) => void;
}

const DEFAULT_APPLICATION_DATA: ApplicationData = {
  brandName: '',
  classType: '',
  beverageType: 'distilled_spirits' as BeverageType,
  alcoholContent: '',
  netContents: '',
  producerName: '',
  producerAddress: '',
};

export default function BatchUpload({ onComplete }: BatchUploadProps) {
  const [items, setItems] = useState<BatchItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [useSharedData, setUseSharedData] = useState(false);
  const [sharedData, setSharedData] = useState<ApplicationData>(DEFAULT_APPLICATION_DATA);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newItems: BatchItem[] = acceptedFiles.map(file => ({
      id: `${file.name}-${Date.now()}-${Math.random()}`,
      file,
      preview: URL.createObjectURL(file),
      applicationData: { ...DEFAULT_APPLICATION_DATA },
      status: 'pending' as const
    }));
    
    setItems(prev => [...prev, ...newItems]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'image/webp': ['.webp'],
    },
    maxSize: 10 * 1024 * 1024,
    disabled: isProcessing,
  });

  const removeItem = (id: string) => {
    setItems(prev => {
      const item = prev.find(i => i.id === id);
      if (item) URL.revokeObjectURL(item.preview);
      return prev.filter(i => i.id !== id);
    });
  };

  const updateItemData = (id: string, data: Partial<ApplicationData>) => {
    setItems(prev => prev.map(item => 
      item.id === id 
        ? { ...item, applicationData: { ...item.applicationData, ...data } }
        : item
    ));
  };

  const processAll = async () => {
    if (items.length === 0) return;
    
    setIsProcessing(true);
    
    const itemsToProcess = items.filter(item => item.status !== 'completed');
    
    // Process in batches of 5 for performance
    for (let i = 0; i < itemsToProcess.length; i += 5) {
      const batch = itemsToProcess.slice(i, i + 5);
      
      await Promise.all(batch.map(async (item) => {
        setItems(prev => prev.map(i => 
          i.id === item.id ? { ...i, status: 'processing' } : i
        ));
        
        try {
          // Convert file to base64
          const base64 = await fileToBase64(item.file);
          const dataToUse = useSharedData ? sharedData : item.applicationData;
          
          const response = await fetch('/api/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              labelImage: base64,
              mimeType: item.file.type,
              applicationData: dataToUse,
            }),
          });
          
          const data = await response.json();
          
          if (data.success) {
            setItems(prev => prev.map(i => 
              i.id === item.id 
                ? { ...i, status: 'completed', result: data.result }
                : i
            ));
          } else {
            throw new Error(data.error || 'Verification failed');
          }
        } catch (error) {
          setItems(prev => prev.map(i => 
            i.id === item.id 
              ? { ...i, status: 'error', error: error instanceof Error ? error.message : 'Unknown error' }
              : i
          ));
        }
      }));
    }
    
    setIsProcessing(false);
    
    const completedResults = items
      .filter(item => item.result)
      .map(item => item.result!);
    
    onComplete?.(completedResults);
  };

  const clearAll = () => {
    items.forEach(item => URL.revokeObjectURL(item.preview));
    setItems([]);
  };

  const exportResults = () => {
    const results = items.filter(i => i.result).map(item => ({
      filename: item.file.name,
      status: item.result!.status,
      confidence: item.result!.overallConfidence,
      matchedFields: item.result!.matchedFields,
      totalFields: item.result!.totalFields,
      issues: item.result!.flaggedIssues,
      governmentWarningValid: item.result!.governmentWarningCorrect,
    }));
    
    const csv = [
      ['Filename', 'Status', 'Confidence', 'Matched Fields', 'Gov Warning Valid', 'Issues'],
      ...results.map(r => [
        r.filename,
        r.status,
        `${(r.confidence * 100).toFixed(0)}%`,
        `${r.matchedFields}/${r.totalFields}`,
        r.governmentWarningValid ? 'Yes' : 'No',
        r.issues.join('; ')
      ])
    ].map(row => row.join(',')).join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `label-verification-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const summary = {
    total: items.length,
    approved: items.filter(i => i.result?.status === 'approved').length,
    rejected: items.filter(i => i.result?.status === 'rejected').length,
    needsReview: items.filter(i => i.result?.status === 'needs_review').length,
    pending: items.filter(i => i.status === 'pending').length,
    processing: items.filter(i => i.status === 'processing').length,
    error: items.filter(i => i.status === 'error').length,
  };

  return (
    <div className="space-y-6">
      {/* Dropzone */}
      <div
        {...getRootProps()}
        className={`
          drop-zone
          ${isDragActive ? 'drop-zone-active' : ''}
          ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        <input {...getInputProps()} />
        <FileSpreadsheet className="w-12 h-12 text-navy-400" />
        <div className="text-center">
          <p className="text-lg font-semibold text-navy-800">
            Drag & drop multiple label images
          </p>
          <p className="text-navy-500 mt-1">
            or click to select files • Upload up to 50 labels at once
          </p>
        </div>
      </div>

      {/* Shared Application Data Toggle */}
      {items.length > 0 && (
        <div className="card p-4">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={useSharedData}
              onChange={(e) => setUseSharedData(e.target.checked)}
              className="w-5 h-5 rounded border-navy-300 text-navy-600 focus:ring-navy-500"
            />
            <span className="font-medium text-navy-700">
              Use same application data for all labels
            </span>
          </label>
          
          {useSharedData && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-3"
            >
              <input
                type="text"
                placeholder="Brand Name"
                value={sharedData.brandName}
                onChange={(e) => setSharedData(prev => ({ ...prev, brandName: e.target.value }))}
                className="input-field text-sm"
              />
              <input
                type="text"
                placeholder="Class/Type"
                value={sharedData.classType}
                onChange={(e) => setSharedData(prev => ({ ...prev, classType: e.target.value }))}
                className="input-field text-sm"
              />
              <input
                type="text"
                placeholder="Alcohol Content"
                value={sharedData.alcoholContent}
                onChange={(e) => setSharedData(prev => ({ ...prev, alcoholContent: e.target.value }))}
                className="input-field text-sm"
              />
              <input
                type="text"
                placeholder="Net Contents"
                value={sharedData.netContents}
                onChange={(e) => setSharedData(prev => ({ ...prev, netContents: e.target.value }))}
                className="input-field text-sm"
              />
              <input
                type="text"
                placeholder="Producer Name"
                value={sharedData.producerName}
                onChange={(e) => setSharedData(prev => ({ ...prev, producerName: e.target.value }))}
                className="input-field text-sm"
              />
              <input
                type="text"
                placeholder="Producer Address"
                value={sharedData.producerAddress}
                onChange={(e) => setSharedData(prev => ({ ...prev, producerAddress: e.target.value }))}
                className="input-field text-sm"
              />
            </motion.div>
          )}
        </div>
      )}

      {/* Summary Stats */}
      {items.length > 0 && (
        <div className="grid grid-cols-3 md:grid-cols-7 gap-2">
          <SummaryBadge label="Total" value={summary.total} />
          <SummaryBadge label="Approved" value={summary.approved} variant="success" />
          <SummaryBadge label="Rejected" value={summary.rejected} variant="error" />
          <SummaryBadge label="Review" value={summary.needsReview} variant="warning" />
          <SummaryBadge label="Pending" value={summary.pending} />
          <SummaryBadge label="Processing" value={summary.processing} variant="processing" />
          <SummaryBadge label="Errors" value={summary.error} variant="error" />
        </div>
      )}

      {/* Items List */}
      <AnimatePresence>
        {items.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-3"
          >
            {items.map((item, index) => (
              <BatchItemCard
                key={item.id}
                item={item}
                index={index}
                onRemove={() => removeItem(item.id)}
                onUpdateData={(data) => updateItemData(item.id, data)}
                showDataInputs={!useSharedData}
                disabled={isProcessing}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Actions */}
      {items.length > 0 && (
        <div className="flex flex-wrap gap-3">
          <button
            onClick={processAll}
            disabled={isProcessing || items.every(i => i.status === 'completed')}
            className="btn-primary"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <RefreshCw className="w-5 h-5" />
                Verify All Labels
              </>
            )}
          </button>
          
          {items.some(i => i.result) && (
            <button onClick={exportResults} className="btn-secondary">
              <Download className="w-5 h-5" />
              Export Results
            </button>
          )}
          
          <button onClick={clearAll} className="btn-secondary text-rejected hover:bg-rejected-light">
            <X className="w-5 h-5" />
            Clear All
          </button>
        </div>
      )}
    </div>
  );
}

function BatchItemCard({
  item,
  index,
  onRemove,
  onUpdateData,
  showDataInputs,
  disabled
}: {
  item: BatchItem;
  index: number;
  onRemove: () => void;
  onUpdateData: (data: Partial<ApplicationData>) => void;
  showDataInputs: boolean;
  disabled: boolean;
}) {
  const statusIcons = {
    pending: <div className="w-5 h-5 rounded-full border-2 border-navy-300" />,
    processing: <Loader2 className="w-5 h-5 text-navy-600 animate-spin" />,
    completed: item.result?.status === 'approved' 
      ? <CheckCircle2 className="w-5 h-5 text-approved" />
      : item.result?.status === 'rejected'
        ? <XCircle className="w-5 h-5 text-rejected" />
        : <AlertTriangle className="w-5 h-5 text-review" />,
    error: <XCircle className="w-5 h-5 text-rejected" />
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ delay: index * 0.05 }}
      className={`card p-4 ${item.status === 'processing' ? 'ring-2 ring-navy-400' : ''}`}
    >
      <div className="flex items-start gap-4">
        {/* Preview */}
        <div className="relative w-16 h-16 rounded-lg overflow-hidden bg-navy-100 flex-shrink-0">
          <img 
            src={item.preview} 
            alt={item.file.name}
            className="w-full h-full object-cover"
          />
        </div>
        
        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            {statusIcons[item.status]}
            <h4 className="font-medium text-navy-800 truncate">{item.file.name}</h4>
          </div>
          
          {item.result && (
            <p className="text-sm text-navy-500 mt-1">
              {item.result.matchedFields}/{item.result.totalFields} fields matched • 
              {(item.result.overallConfidence * 100).toFixed(0)}% confidence
            </p>
          )}
          
          {item.error && (
            <p className="text-sm text-rejected mt-1">{item.error}</p>
          )}
          
          {showDataInputs && item.status === 'pending' && (
            <div className="mt-2 grid grid-cols-3 gap-2">
              <input
                type="text"
                placeholder="Brand Name"
                value={item.applicationData.brandName}
                onChange={(e) => onUpdateData({ brandName: e.target.value })}
                className="input-field text-xs py-2"
                disabled={disabled}
              />
              <input
                type="text"
                placeholder="Alcohol %"
                value={item.applicationData.alcoholContent}
                onChange={(e) => onUpdateData({ alcoholContent: e.target.value })}
                className="input-field text-xs py-2"
                disabled={disabled}
              />
              <input
                type="text"
                placeholder="Net Contents"
                value={item.applicationData.netContents}
                onChange={(e) => onUpdateData({ netContents: e.target.value })}
                className="input-field text-xs py-2"
                disabled={disabled}
              />
            </div>
          )}
        </div>
        
        {/* Remove Button */}
        {!disabled && (
          <button
            onClick={onRemove}
            className="p-2 text-navy-400 hover:text-rejected hover:bg-rejected-light rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>
    </motion.div>
  );
}

function SummaryBadge({ 
  label, 
  value, 
  variant = 'default' 
}: { 
  label: string; 
  value: number;
  variant?: 'default' | 'success' | 'error' | 'warning' | 'processing';
}) {
  const variants = {
    default: 'bg-navy-100 text-navy-700',
    success: 'bg-approved-light text-approved',
    error: 'bg-rejected-light text-rejected',
    warning: 'bg-review-light text-review',
    processing: 'bg-navy-200 text-navy-700'
  };

  return (
    <div className={`px-3 py-2 rounded-xl text-center ${variants[variant]}`}>
      <div className="text-xl font-bold">{value}</div>
      <div className="text-xs">{label}</div>
    </div>
  );
}

async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      // Remove the data URL prefix
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
  });
}

