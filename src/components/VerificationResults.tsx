'use client';

import React from 'react';
import { VerificationResult, FieldVerification } from '@/types';
import { 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Clock, 
  FileText,
  Shield,
  TrendingUp,
  Eye
} from 'lucide-react';
import { motion } from 'framer-motion';

interface VerificationResultsProps {
  result: VerificationResult;
}

export default function VerificationResults({ result }: VerificationResultsProps) {
  const statusConfig = {
    approved: {
      icon: <CheckCircle2 className="w-8 h-8" />,
      title: 'APPROVED',
      subtitle: 'Label matches application data',
      bgClass: 'bg-gradient-to-br from-approved to-emerald-600',
      borderClass: 'border-approved',
      badgeClass: 'status-approved'
    },
    rejected: {
      icon: <XCircle className="w-8 h-8" />,
      title: 'REJECTED',
      subtitle: 'Discrepancies found - see details below',
      bgClass: 'bg-gradient-to-br from-rejected to-red-600',
      borderClass: 'border-rejected',
      badgeClass: 'status-rejected'
    },
    needs_review: {
      icon: <AlertTriangle className="w-8 h-8" />,
      title: 'NEEDS REVIEW',
      subtitle: 'Human verification recommended',
      bgClass: 'bg-gradient-to-br from-review to-amber-600',
      borderClass: 'border-review',
      badgeClass: 'status-review'
    }
  };

  const config = statusConfig[result.status];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Status Banner */}
      <motion.div
        initial={{ scale: 0.95 }}
        animate={{ scale: 1 }}
        className={`${config.bgClass} text-white rounded-2xl p-6 shadow-xl`}
      >
        <div className="flex items-center gap-4">
          <div className="p-3 bg-white/20 rounded-xl backdrop-blur">
            {config.icon}
          </div>
          <div>
            <h2 className="text-2xl font-bold tracking-tight">{config.title}</h2>
            <p className="text-white/90">{config.subtitle}</p>
          </div>
          <div className="ml-auto text-right">
            <div className="text-sm text-white/70">Confidence</div>
            <div className="text-2xl font-bold">
              {(result.overallConfidence * 100).toFixed(0)}%
            </div>
          </div>
        </div>
      </motion.div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          icon={<Clock className="w-5 h-5" />}
          label="Processing Time"
          value={`${result.processingTimeMs}ms`}
          success={result.processingTimeMs < 5000}
        />
        <StatCard
          icon={<FileText className="w-5 h-5" />}
          label="Fields Matched"
          value={`${result.matchedFields}/${result.totalFields}`}
          success={result.matchedFields === result.totalFields}
        />
        <StatCard
          icon={<Shield className="w-5 h-5" />}
          label="Gov. Warning"
          value={result.governmentWarningCorrect ? 'Valid' : 'Invalid'}
          success={result.governmentWarningCorrect}
        />
        <StatCard
          icon={<TrendingUp className="w-5 h-5" />}
          label="Confidence"
          value={`${(result.overallConfidence * 100).toFixed(0)}%`}
          success={result.overallConfidence >= 0.85}
        />
      </div>

      {/* Human Review Alert */}
      {result.requiresHumanReview && (
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-start gap-4 p-4 bg-review-light border border-review rounded-xl"
        >
          <Eye className="w-6 h-6 text-review flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-review">Human Review Required</h3>
            <ul className="mt-2 space-y-1">
              {result.humanReviewReasons.map((reason, index) => (
                <li key={index} className="text-sm text-review/80">• {reason}</li>
              ))}
            </ul>
          </div>
        </motion.div>
      )}

      {/* Flagged Issues */}
      {result.flaggedIssues.length > 0 && (
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="p-4 bg-rejected-light border border-rejected rounded-xl"
        >
          <h3 className="font-semibold text-rejected flex items-center gap-2">
            <XCircle className="w-5 h-5" />
            Issues Found ({result.flaggedIssues.length})
          </h3>
          <ul className="mt-2 space-y-1">
            {result.flaggedIssues.map((issue, index) => (
              <li key={index} className="text-sm text-rejected/80">• {issue}</li>
            ))}
          </ul>
        </motion.div>
      )}

      {/* Government Warning Check */}
      <div className="card">
        <div className="card-header">
          <h3 className="font-semibold text-navy-800 flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Government Warning Verification
          </h3>
        </div>
        <div className="p-6">
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-xl ${result.governmentWarningCorrect ? 'bg-approved-light' : 'bg-rejected-light'}`}>
              {result.governmentWarningCorrect ? (
                <CheckCircle2 className="w-6 h-6 text-approved" />
              ) : (
                <XCircle className="w-6 h-6 text-rejected" />
              )}
            </div>
            <div>
              <p className="font-semibold text-navy-800">
                {result.governmentWarningPresent ? 'Warning Present' : 'Warning Not Found'}
              </p>
              <p className={`text-sm ${result.governmentWarningCorrect ? 'text-approved' : 'text-rejected'}`}>
                {result.governmentWarningNotes || (result.governmentWarningCorrect ? 'Format and text verified' : 'See issues above')}
              </p>
            </div>
          </div>
          
          {result.extractedData.governmentWarning && (
            <div className="mt-4 p-4 bg-navy-50 rounded-xl">
              <p className="text-xs font-semibold text-navy-500 uppercase tracking-wider mb-2">
                Extracted Text
              </p>
              <p className="text-sm text-navy-700 font-mono whitespace-pre-wrap">
                {result.extractedData.governmentWarning}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Field-by-Field Verification */}
      <div className="card">
        <div className="card-header">
          <h3 className="font-semibold text-navy-800 flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Field Verification Details
          </h3>
        </div>
        <div className="divide-y divide-navy-100">
          {result.fieldVerifications.map((field, index) => (
            <FieldRow key={index} field={field} />
          ))}
        </div>
      </div>

      {/* Extracted Raw Text */}
      {result.extractedData.rawText && (
        <details className="card group">
          <summary className="card-header cursor-pointer hover:bg-navy-100 transition-colors">
            <h3 className="font-semibold text-navy-800 flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Raw Extracted Text
              <span className="text-xs text-navy-500">(click to expand)</span>
            </h3>
          </summary>
          <div className="p-6">
            <pre className="text-sm text-navy-700 font-mono whitespace-pre-wrap bg-navy-50 p-4 rounded-xl overflow-auto max-h-64">
              {result.extractedData.rawText}
            </pre>
          </div>
        </details>
      )}
    </motion.div>
  );
}

function StatCard({ 
  icon, 
  label, 
  value, 
  success 
}: { 
  icon: React.ReactNode; 
  label: string; 
  value: string; 
  success: boolean;
}) {
  return (
    <div className={`p-4 rounded-xl border-2 ${success ? 'border-approved/20 bg-approved-light/50' : 'border-navy-200 bg-white'}`}>
      <div className={`inline-flex p-2 rounded-lg ${success ? 'bg-approved/10 text-approved' : 'bg-navy-100 text-navy-500'}`}>
        {icon}
      </div>
      <p className="mt-3 text-sm text-navy-500">{label}</p>
      <p className="text-lg font-bold text-navy-800">{value}</p>
    </div>
  );
}

function FieldRow({ field }: { field: FieldVerification }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="p-4 hover:bg-navy-50 transition-colors"
    >
      <div className="flex items-start gap-4">
        <div className={`p-2 rounded-lg flex-shrink-0 ${field.matches ? 'bg-approved-light' : 'bg-rejected-light'}`}>
          {field.matches ? (
            <CheckCircle2 className="w-5 h-5 text-approved" />
          ) : (
            <XCircle className="w-5 h-5 text-rejected" />
          )}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-4">
            <h4 className="font-semibold text-navy-800">{field.field}</h4>
            <span className={`text-sm font-medium ${field.matches ? 'text-approved' : 'text-rejected'}`}>
              {(field.confidence * 100).toFixed(0)}% confidence
            </span>
          </div>
          
          <div className="mt-2 grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-navy-500 text-xs uppercase tracking-wider mb-1">Application</p>
              <p className="text-navy-700 font-medium truncate">{field.applicationValue || '—'}</p>
            </div>
            <div>
              <p className="text-navy-500 text-xs uppercase tracking-wider mb-1">Label</p>
              <p className="text-navy-700 font-medium truncate">{field.labelValue || 'Not found'}</p>
            </div>
          </div>
          
          {field.notes && (
            <p className="mt-2 text-sm text-navy-500 italic">{field.notes}</p>
          )}
        </div>
      </div>
    </motion.div>
  );
}

