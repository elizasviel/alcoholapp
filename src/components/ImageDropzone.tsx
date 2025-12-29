'use client';

import React, { useCallback, useState } from 'react';
import { useDropzone, FileRejection } from 'react-dropzone';
import { Upload, X, AlertCircle, CheckCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ImageDropzoneProps {
  onImagesSelected: (files: File[]) => void;
  maxFiles?: number;
  multiple?: boolean;
  disabled?: boolean;
}

interface PreviewImage {
  file: File;
  preview: string;
  id: string;
}

export default function ImageDropzone({
  onImagesSelected,
  maxFiles = 1,
  multiple = false,
  disabled = false
}: ImageDropzoneProps) {
  const [images, setImages] = useState<PreviewImage[]>([]);
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback((acceptedFiles: File[], rejectedFiles: FileRejection[]) => {
    setError(null);

    if (rejectedFiles.length > 0) {
      const errorMessages = rejectedFiles[0].errors.map(e => e.message).join(', ');
      setError(errorMessages);
      return;
    }

    const newImages: PreviewImage[] = acceptedFiles.map(file => ({
      file,
      preview: URL.createObjectURL(file),
      id: `${file.name}-${Date.now()}-${Math.random()}`
    }));

    const updatedImages = multiple ? [...images, ...newImages].slice(0, maxFiles) : newImages;
    setImages(updatedImages);
    onImagesSelected(updatedImages.map(img => img.file));
  }, [images, multiple, maxFiles, onImagesSelected]);

  const removeImage = (id: string) => {
    const updatedImages = images.filter(img => img.id !== id);
    setImages(updatedImages);
    onImagesSelected(updatedImages.map(img => img.file));
  };

  const clearAll = () => {
    images.forEach(img => URL.revokeObjectURL(img.preview));
    setImages([]);
    onImagesSelected([]);
  };

  const { getRootProps, getInputProps, isDragActive, isDragAccept, isDragReject } = useDropzone({
    onDrop,
    accept: {
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'image/webp': ['.webp'],
      'image/gif': ['.gif']
    },
    maxFiles: multiple ? maxFiles : 1,
    multiple,
    disabled,
    maxSize: 10 * 1024 * 1024, // 10MB max
  });

  return (
    <div className="space-y-4">
      <div
        {...getRootProps()}
        className={`
          drop-zone relative
          ${isDragActive ? 'drop-zone-active' : ''}
          ${isDragReject ? 'border-rejected bg-rejected-light' : ''}
          ${isDragAccept ? 'border-approved bg-approved-light' : ''}
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        <input {...getInputProps()} />
        
        <div className="text-center space-y-4">
          <motion.div
            animate={isDragActive ? { scale: 1.1, rotate: 5 } : { scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 300 }}
            className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-navy-100 to-navy-200 text-navy-600"
          >
            <Upload className="w-8 h-8" />
          </motion.div>
          
          <div>
            <p className="text-lg font-semibold text-navy-800">
              {isDragActive ? 'Drop your label here!' : 'Drag & drop label image'}
            </p>
            <p className="text-navy-500 mt-1">
              or <span className="text-navy-700 font-medium underline underline-offset-2">browse files</span>
            </p>
          </div>
          
          <p className="text-sm text-navy-400">
            Supports JPG, PNG, WebP • Max 10MB
            {multiple && ` • Up to ${maxFiles} files`}
          </p>
        </div>
      </div>

      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex items-center gap-2 p-4 bg-rejected-light text-rejected rounded-xl"
          >
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <p className="text-sm font-medium">{error}</p>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {images.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-3"
          >
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-navy-700">
                {images.length} image{images.length !== 1 ? 's' : ''} selected
              </p>
              {images.length > 1 && (
                <button
                  onClick={clearAll}
                  className="text-sm text-navy-500 hover:text-rejected transition-colors"
                >
                  Clear all
                </button>
              )}
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {images.map((img, index) => (
                <motion.div
                  key={img.id}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ delay: index * 0.05 }}
                  className="relative group aspect-square rounded-xl overflow-hidden bg-navy-100 border-2 border-navy-200"
                >
                  <img
                    src={img.preview}
                    alt={img.file.name}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-navy-900/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeImage(img.id);
                    }}
                    className="absolute top-2 right-2 p-1.5 bg-white rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-rejected-light"
                  >
                    <X className="w-4 h-4 text-navy-700" />
                  </button>
                  <div className="absolute bottom-2 left-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <p className="text-xs text-white truncate font-medium">
                      {img.file.name}
                    </p>
                  </div>
                  <div className="absolute top-2 left-2">
                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-approved text-white text-xs font-bold">
                      <CheckCircle className="w-4 h-4" />
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

