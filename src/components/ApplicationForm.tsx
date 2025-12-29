'use client';

import React from 'react';
import { ApplicationData, BeverageType } from '@/types';
import { Wine, Beer, Martini, HelpCircle } from 'lucide-react';
import { motion } from 'framer-motion';

interface ApplicationFormProps {
  data: ApplicationData;
  onChange: (data: ApplicationData) => void;
  disabled?: boolean;
}

const BEVERAGE_TYPES: { value: BeverageType; label: string; icon: React.ReactNode }[] = [
  { value: 'wine', label: 'Wine', icon: <Wine className="w-5 h-5" /> },
  { value: 'beer', label: 'Beer', icon: <Beer className="w-5 h-5" /> },
  { value: 'distilled_spirits', label: 'Spirits', icon: <Martini className="w-5 h-5" /> },
];

export default function ApplicationForm({ data, onChange, disabled = false }: ApplicationFormProps) {
  const updateField = <K extends keyof ApplicationData>(field: K, value: ApplicationData[K]) => {
    onChange({ ...data, [field]: value });
  };

  return (
    <div className="space-y-6">
      {/* Beverage Type Selection */}
      <div>
        <label className="label flex items-center gap-2">
          Beverage Type
          <span className="text-rejected">*</span>
        </label>
        <div className="grid grid-cols-3 gap-3">
          {BEVERAGE_TYPES.map((type) => (
            <motion.button
              key={type.value}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => updateField('beverageType', type.value)}
              disabled={disabled}
              className={`
                flex items-center justify-center gap-2 p-4 rounded-xl border-2 font-medium transition-all
                ${data.beverageType === type.value
                  ? 'border-navy-600 bg-navy-50 text-navy-700'
                  : 'border-navy-200 bg-white text-navy-500 hover:border-navy-300'
                }
                ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              `}
            >
              {type.icon}
              {type.label}
            </motion.button>
          ))}
        </div>
      </div>

      {/* Core Fields Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="label">
            Brand Name <span className="text-rejected">*</span>
          </label>
          <input
            type="text"
            value={data.brandName}
            onChange={(e) => updateField('brandName', e.target.value)}
            placeholder="e.g., OLD TOM DISTILLERY"
            className="input-field"
            disabled={disabled}
          />
        </div>

        <div>
          <label className="label">
            Fanciful Name
            <Tooltip text="Additional product name or tagline (optional)" />
          </label>
          <input
            type="text"
            value={data.fancifulName || ''}
            onChange={(e) => updateField('fancifulName', e.target.value)}
            placeholder="e.g., Reserve Collection"
            className="input-field"
            disabled={disabled}
          />
        </div>

        <div>
          <label className="label">
            Class/Type <span className="text-rejected">*</span>
          </label>
          <input
            type="text"
            value={data.classType}
            onChange={(e) => updateField('classType', e.target.value)}
            placeholder="e.g., Kentucky Straight Bourbon Whiskey"
            className="input-field"
            disabled={disabled}
          />
        </div>

        <div>
          <label className="label">
            Alcohol Content <span className="text-rejected">*</span>
          </label>
          <input
            type="text"
            value={data.alcoholContent}
            onChange={(e) => updateField('alcoholContent', e.target.value)}
            placeholder="e.g., 45% Alc./Vol."
            className="input-field"
            disabled={disabled}
          />
        </div>

        <div>
          <label className="label">
            Net Contents <span className="text-rejected">*</span>
          </label>
          <input
            type="text"
            value={data.netContents}
            onChange={(e) => updateField('netContents', e.target.value)}
            placeholder="e.g., 750 mL"
            className="input-field"
            disabled={disabled}
          />
        </div>

        {data.beverageType === 'distilled_spirits' && (
          <div>
            <label className="label">
              Proof
              <Tooltip text="Required for distilled spirits (e.g., 90 Proof)" />
            </label>
            <input
              type="text"
              value={data.proof || ''}
              onChange={(e) => updateField('proof', e.target.value)}
              placeholder="e.g., 90 Proof"
              className="input-field"
              disabled={disabled}
            />
          </div>
        )}
      </div>

      {/* Producer Information */}
      <div className="pt-4 border-t border-navy-200">
        <h4 className="text-sm font-semibold text-navy-600 uppercase tracking-wider mb-4">
          Producer Information
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="label">
              Producer/Bottler Name <span className="text-rejected">*</span>
            </label>
            <input
              type="text"
              value={data.producerName}
              onChange={(e) => updateField('producerName', e.target.value)}
              placeholder="e.g., Old Tom Distilling Co."
              className="input-field"
              disabled={disabled}
            />
          </div>

          <div>
            <label className="label">
              Producer Address <span className="text-rejected">*</span>
            </label>
            <input
              type="text"
              value={data.producerAddress}
              onChange={(e) => updateField('producerAddress', e.target.value)}
              placeholder="e.g., Louisville, KY"
              className="input-field"
              disabled={disabled}
            />
          </div>

          <div>
            <label className="label">
              Country of Origin
              <Tooltip text="Required for imported products" />
            </label>
            <input
              type="text"
              value={data.countryOfOrigin || ''}
              onChange={(e) => updateField('countryOfOrigin', e.target.value)}
              placeholder="e.g., United States"
              className="input-field"
              disabled={disabled}
            />
          </div>
        </div>
      </div>

      {/* Wine-specific fields */}
      {data.beverageType === 'wine' && (
        <div className="pt-4 border-t border-navy-200">
          <h4 className="text-sm font-semibold text-navy-600 uppercase tracking-wider mb-4">
            Wine Details
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">Vintage Year</label>
              <input
                type="text"
                value={data.vintageYear || ''}
                onChange={(e) => updateField('vintageYear', e.target.value)}
                placeholder="e.g., 2019"
                className="input-field"
                disabled={disabled}
              />
            </div>

            <div>
              <label className="label">Appellation</label>
              <input
                type="text"
                value={data.appellation || ''}
                onChange={(e) => updateField('appellation', e.target.value)}
                placeholder="e.g., Napa Valley"
                className="input-field"
                disabled={disabled}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Tooltip({ text }: { text: string }) {
  return (
    <span className="group relative inline-block ml-1">
      <HelpCircle className="w-4 h-4 text-navy-400 cursor-help" />
      <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-navy-800 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 pointer-events-none">
        {text}
        <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-navy-800" />
      </span>
    </span>
  );
}

