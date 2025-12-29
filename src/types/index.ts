// Types for TTB Label Verification Application
// Based on 27 CFR Parts 4, 5, 7, and 16

export type BeverageType = 'wine' | 'beer' | 'distilled_spirits';

export type ProducerRole = 'bottled_by' | 'produced_by' | 'distilled_by' | 'imported_by' | 'blended_by';

export type ImageQualityIssue = 
  | 'blur'
  | 'low_resolution' 
  | 'glare'
  | 'angle_distortion'
  | 'partial_occlusion'
  | 'poor_lighting'
  | 'oversaturation'
  | 'text_cut_off'
  | 'multiple_labels';

export interface ImageQualityAssessment {
  overallScore: number; // 0-1
  issues: ImageQualityIssue[];
  recommendResubmit: boolean;
  details?: string;
}

export interface GovernmentWarningDetails {
  prefixInAllCaps: boolean;
  appearsBold: boolean | null; // null if cannot be determined
  onContrastingBackground: boolean | null;
  textComplete: boolean;
  issues: string[];
}

export interface ApplicationData {
  // Core identification
  brandName: string;
  fancifulName?: string;
  classType: string;
  beverageType: BeverageType;
  
  // Alcohol content
  alcoholContent: string; // e.g., "45% Alc./Vol." or "14.5%"
  proof?: string; // For distilled spirits, e.g., "90 Proof"
  
  // Volume and packaging
  netContents: string; // e.g., "750 mL"
  
  // Producer information
  producerName: string;
  producerAddress: string;
  countryOfOrigin?: string; // Required for imports
  
  // Optional fields
  vintageYear?: string;
  appellation?: string;
  healthClaimsOrStatements?: string;
  
  // Wine-specific
  containsSulfites?: boolean;
  
  // Spirits-specific
  ageStatement?: string;
}

export interface ExtractedLabelData {
  brandName?: string;
  fancifulName?: string;
  classType?: string;
  alcoholContent?: string;
  proof?: string;
  netContents?: string;
  producerName?: string;
  producerAddress?: string;
  producerRole?: ProducerRole;
  countryOfOrigin?: string;
  governmentWarning?: string;
  governmentWarningFormatCorrect?: boolean;
  governmentWarningDetails?: GovernmentWarningDetails;
  vintageYear?: string;
  appellation?: string;
  containsSulfites?: boolean;
  ageStatement?: string;
  rawText?: string;
  confidence: number; // 0-1 overall confidence score
  
  // Per-field confidence scores for granular analysis
  fieldConfidences?: Record<string, number>;
  
  // Image quality assessment
  imageQuality?: ImageQualityAssessment;
  
  // Extraction notes from AI
  extractionNotes?: string;
}

export type VerificationStatus = 'approved' | 'rejected' | 'needs_review';

export interface FieldVerification {
  field: string;
  applicationValue: string;
  labelValue: string | undefined;
  matches: boolean;
  confidence: number;
  notes?: string;
}

export interface VerificationResult {
  id: string;
  timestamp: string;
  status: VerificationStatus;
  overallConfidence: number;
  processingTimeMs: number;
  
  // Field-by-field verification
  fieldVerifications: FieldVerification[];
  
  // Government warning check
  governmentWarningPresent: boolean;
  governmentWarningCorrect: boolean;
  governmentWarningNotes?: string;
  governmentWarningIssues?: string[];
  
  // Extracted data
  extractedData: ExtractedLabelData;
  
  // Summary
  matchedFields: number;
  totalFields: number;
  flaggedIssues: string[];
  
  // For human review
  requiresHumanReview: boolean;
  humanReviewReasons: string[];
  
  // Image quality feedback
  imageQualityScore?: number;
  imageQualityIssues?: ImageQualityIssue[];
  
  // Performance tracking
  meetsTargetTime: boolean; // <5 seconds per Sarah's requirement
}

export interface BatchVerificationJob {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  totalLabels: number;
  processedLabels: number;
  results: VerificationResult[];
  startTime: string;
  endTime?: string;
  errors: string[];
  
  // Summary statistics
  summary?: {
    approved: number;
    rejected: number;
    needsReview: number;
    avgProcessingTimeMs: number;
    avgConfidence: number;
  };
}

export interface BatchValidation {
  totalFiles: number;
  validFiles: number;
  invalidFiles: { filename: string; reason: string }[];
  duplicates: string[];
  estimatedProcessingTimeMs: number;
}

export interface LabelUpload {
  id: string;
  file: File;
  preview: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  result?: VerificationResult;
  error?: string;
}

// Government Warning - Must be exact per 27 CFR 16
export const GOVERNMENT_WARNING_TEXT = `GOVERNMENT WARNING: (1) According to the Surgeon General, women should not drink alcoholic beverages during pregnancy because of the risk of birth defects. (2) Consumption of alcoholic beverages impairs your ability to drive a car or operate machinery, and may cause health problems.`;

// Required phrases that MUST appear in the government warning
export const GOVERNMENT_WARNING_REQUIRED_PHRASES = [
  'government warning',
  'surgeon general',
  'women should not drink',
  'pregnancy',
  'birth defects',
  'impairs your ability',
  'drive a car',
  'operate machinery',
  'health problems',
];

// Regex patterns for validation
export const ALCOHOL_CONTENT_PATTERNS = {
  // Standard formats: "45% Alc./Vol.", "45% ABV", "45% Alcohol by Volume"
  percentage: /(\d+(?:\.\d+)?)\s*%\s*(?:alc\.?\/vol\.?|abv|alcohol\s*by\s*volume)/i,
  // Proof format: "90 Proof"
  proof: /(\d+)\s*proof/i,
  // Combined format: "45% Alc./Vol. (90 Proof)"
  combined: /(\d+(?:\.\d+)?)\s*%\s*(?:alc\.?\/vol\.?|abv).*?(\d+)\s*proof/i,
  // Bare percentage (invalid, needs Alc./Vol. or ABV)
  barePercentage: /^(\d+(?:\.\d+)?)\s*%$/,
};

export const NET_CONTENTS_PATTERNS = {
  metric: /(\d+(?:\.\d+)?)\s*(mL|L|ml|l|liters?|milliliters?)/i,
  imperial: /(\d+(?:\.\d+)?)\s*(fl\.?\s*oz\.?|oz\.?|ounces?)/i,
};

// Standard fill sizes per TTB regulations (in mL)
export const STANDARD_FILL_SIZES = {
  distilled_spirits: [50, 100, 200, 375, 750, 1000, 1750],
  wine: [187, 375, 500, 750, 1000, 1500, 3000],
  beer: [355, 473, 650, 946], // 12oz, 16oz, 22oz, 32oz converted to mL
};

// TTB Alcohol Content Tolerances per 27 CFR
export const ALCOHOL_CONTENT_TOLERANCES = {
  distilled_spirits: {
    highProof: { threshold: 50, tolerance: 0.15 }, // Over 100 proof: ±0.15%
    lowProof: { threshold: 50, tolerance: 0.3 },   // 100 proof and under: ±0.3%
  },
  wine: {
    tableWine: { min: 7, max: 14, tolerance: 1.5 },
    dessertWine: { min: 14, max: 24, tolerance: 1.0 },
  },
  beer: {
    tolerance: 0.3, // General tolerance for malt beverages
  },
};

// Minimum type size requirements for government warning per 27 CFR 16.22
export const GOVERNMENT_WARNING_TYPE_SIZES = {
  small: { maxContainerMl: 237, typeSizeMm: 1 },   // ≤8 fl oz
  medium: { maxContainerMl: 3000, typeSizeMm: 2 }, // 8 fl oz to 3L
  large: { minContainerMl: 3000, typeSizeMm: 3 },  // ≥3L
};

// Wine appellation rules per 27 CFR 4.25
export const APPELLATION_RULES = {
  state: { minPercentage: 75, description: '75% from named state' },
  county: { minPercentage: 75, description: '75% from named county' },
  ava: { minPercentage: 85, description: '85% from named AVA' },
  estate: { minPercentage: 100, description: '100% estate grown in stated AVA' },
};

// Wine vintage rules per 27 CFR 4.27
export const VINTAGE_RULES = {
  general: { minPercentage: 95 },
  ava: { minPercentage: 85 },
};

