'use client';

import React, { useState, useCallback } from 'react';
import { ApplicationData, VerificationResult, BeverageType } from '@/types';
import ImageDropzone from '@/components/ImageDropzone';
import ApplicationForm from '@/components/ApplicationForm';
import VerificationResults from '@/components/VerificationResults';
import BatchUpload from '@/components/BatchUpload';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Shield, 
  FileCheck, 
  ArrowRight,
  Loader2,
  RefreshCw,
  FileSpreadsheet,
  CheckCircle2
} from 'lucide-react';

type ViewMode = 'single' | 'batch';

const DEFAULT_APPLICATION_DATA: ApplicationData = {
  brandName: '',
  fancifulName: '',
  classType: '',
  beverageType: 'distilled_spirits' as BeverageType,
  alcoholContent: '',
  proof: '',
  netContents: '',
  producerName: '',
  producerAddress: '',
  countryOfOrigin: '',
};

export default function Home() {
  const [viewMode, setViewMode] = useState<ViewMode>('single');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [applicationData, setApplicationData] = useState<ApplicationData>(DEFAULT_APPLICATION_DATA);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [labelPreview, setLabelPreview] = useState<string | null>(null);

  const handleImagesSelected = useCallback((files: File[]) => {
    setSelectedFiles(files);
    setVerificationResult(null);
    setError(null);
    
    if (files.length > 0) {
      const reader = new FileReader();
      reader.onload = (e) => setLabelPreview(e.target?.result as string);
      reader.readAsDataURL(files[0]);
    } else {
      setLabelPreview(null);
    }
  }, []);

  const handleVerify = async () => {
    if (selectedFiles.length === 0) {
      setError('Please upload a label image');
      return;
    }

    if (!applicationData.brandName || !applicationData.alcoholContent) {
      setError('Please fill in at least Brand Name and Alcohol Content');
      return;
    }

    setIsVerifying(true);
    setError(null);

    try {
      const file = selectedFiles[0];
      const base64 = await fileToBase64(file);

      const response = await fetch('/api/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          labelImage: base64,
          mimeType: file.type,
          applicationData,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setVerificationResult(data.result);
      } else {
        setError(data.error || 'Verification failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleReset = () => {
    setSelectedFiles([]);
    setApplicationData(DEFAULT_APPLICATION_DATA);
    setVerificationResult(null);
    setError(null);
    setLabelPreview(null);
  };

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="bg-gradient-to-r from-navy-800 via-navy-900 to-navy-950 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-white/10 rounded-xl backdrop-blur">
                <Shield className="w-8 h-8" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight">TTB Label Verifier</h1>
                <p className="text-navy-300 text-sm">AI-Powered Compliance Checking</p>
              </div>
            </div>
            
            {/* View Mode Toggle */}
            <div className="flex items-center bg-navy-800/50 rounded-xl p-1">
              <button
                onClick={() => setViewMode('single')}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  viewMode === 'single'
                    ? 'bg-white text-navy-900 shadow-lg'
                    : 'text-navy-300 hover:text-white'
                }`}
              >
                <FileCheck className="w-4 h-4 inline mr-2" />
                Single
              </button>
              <button
                onClick={() => setViewMode('batch')}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  viewMode === 'batch'
                    ? 'bg-white text-navy-900 shadow-lg'
                    : 'text-navy-300 hover:text-white'
                }`}
              >
                <FileSpreadsheet className="w-4 h-4 inline mr-2" />
                Batch
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <AnimatePresence mode="wait">
          {viewMode === 'single' ? (
            <motion.div
              key="single"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              {!verificationResult ? (
                <div className="grid lg:grid-cols-2 gap-8">
                  {/* Left Column - Image Upload */}
                  <div className="card">
                    <div className="card-header">
                      <h2 className="text-lg font-semibold text-navy-800 flex items-center gap-2">
                        <FileCheck className="w-5 h-5 text-navy-600" />
                        Step 1: Upload Label Image
                      </h2>
                    </div>
                    <div className="p-6">
                      <ImageDropzone
                        onImagesSelected={handleImagesSelected}
                        maxFiles={1}
                        disabled={isVerifying}
                      />
                      
                      {labelPreview && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="mt-6"
                        >
                          <p className="text-sm font-semibold text-navy-600 mb-2">Preview</p>
                          <div className="relative aspect-video rounded-xl overflow-hidden bg-navy-100 border-2 border-navy-200">
                            <img
                              src={labelPreview}
                              alt="Label preview"
                              className="w-full h-full object-contain"
                            />
                          </div>
                        </motion.div>
                      )}
                    </div>
                  </div>

                  {/* Right Column - Application Data */}
                  <div className="card">
                    <div className="card-header">
                      <h2 className="text-lg font-semibold text-navy-800 flex items-center gap-2">
                        <FileCheck className="w-5 h-5 text-navy-600" />
                        Step 2: Enter Application Data
                      </h2>
                    </div>
                    <div className="p-6">
                      <ApplicationForm
                        data={applicationData}
                        onChange={setApplicationData}
                        disabled={isVerifying}
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <VerificationResults result={verificationResult} />
              )}

              {/* Error Display */}
              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="p-4 bg-rejected-light border border-rejected rounded-xl text-rejected font-medium"
                  >
                    {error}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Action Buttons */}
              <div className="flex justify-center gap-4">
                {!verificationResult ? (
                  <button
                    onClick={handleVerify}
                    disabled={isVerifying || selectedFiles.length === 0}
                    className="btn-primary text-lg px-8 py-4"
                  >
                    {isVerifying ? (
                      <>
                        <Loader2 className="w-6 h-6 animate-spin" />
                        Analyzing Label...
                      </>
                    ) : (
                      <>
                        Verify Label
                        <ArrowRight className="w-6 h-6" />
                      </>
                    )}
                  </button>
                ) : (
                  <button
                    onClick={handleReset}
                    className="btn-primary text-lg px-8 py-4"
                  >
                    <RefreshCw className="w-6 h-6" />
                    Verify Another Label
                  </button>
                )}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="batch"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <div className="card">
                <div className="card-header">
                  <h2 className="text-lg font-semibold text-navy-800 flex items-center gap-2">
                    <FileSpreadsheet className="w-5 h-5 text-navy-600" />
                    Batch Label Verification
                  </h2>
                  <p className="text-sm text-navy-500 mt-1">
                    Upload multiple labels and verify them all at once
          </p>
        </div>
                <div className="p-6">
                  <BatchUpload />
                </div>
        </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

   
    </div>
  );
}

async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
  });
}
