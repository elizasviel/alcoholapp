/**
 * Verification Constraints & Configuration
 * 
 * Defines thresholds, tolerances, and business rules for label verification.
 * Based on TTB requirements and stakeholder interviews:
 * - Sarah Chen: <5 second processing, needs human review for edge cases
 * - Dave Morrison: Handle minor variations like "STONE'S THROW" vs "Stone's Throw"
 * - Jenny Park: Government warning must be exact, ALL CAPS, bold
 * - Marcus Williams: Standalone operation, no false positives
 */

import { BeverageType, ImageQualityIssue } from '@/types';

// ═══════════════════════════════════════════════════════════════════════════
// PROCESSING CONSTRAINTS
// ═══════════════════════════════════════════════════════════════════════════
export const PROCESSING_CONSTRAINTS = {
  // Target processing time (per Sarah's 5-second requirement)
  targetTimeMs: 5000,
  maxTimeMs: 30000,
  warnAfterMs: 7000,
  
  // Batch processing limits
  batch: {
    maxFilesPerBatch: 300, // Janet's large importer batches
    maxFileSizeMb: 10,
    maxTotalBatchSizeMb: 500,
    parallelProcessingLimit: 5, // Process 5 at a time
    estimatedTimePerLabelMs: 3000,
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// CONFIDENCE THRESHOLDS
// ═══════════════════════════════════════════════════════════════════════════
export const CONFIDENCE_THRESHOLDS = {
  // Overall extraction confidence
  high: 0.85,    // Above this = high confidence
  medium: 0.70,  // Above this but below high = moderate
  low: 0.60,     // Below this = low confidence, needs review
  
  // Auto-approval requires this minimum
  autoApprovalMinimum: 0.85,
  
  // Below this triggers human review (Marcus: no false positives)
  humanReviewThreshold: 0.75,
  
  // Per-field confidence thresholds
  field: {
    governmentWarning: 0.95, // Must be near-perfect
    brandName: 0.90,
    alcoholContent: 0.90,
    classType: 0.85,
    netContents: 0.90,
    producerName: 0.80,
    countryOfOrigin: 0.80,
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// STRING MATCHING THRESHOLDS
// ═══════════════════════════════════════════════════════════════════════════
export const MATCHING_THRESHOLDS = {
  // Exact match required for these (only whitespace/case normalization)
  exactMatchFields: ['governmentWarning'],
  
  // High similarity required (90%+)
  highSimilarityFields: {
    fields: ['brandName', 'alcoholContent'],
    threshold: 0.90,
  },
  
  // Moderate similarity OK (80%+)
  moderateSimilarityFields: {
    fields: ['producerName', 'producerAddress'],
    threshold: 0.80,
  },
  
  // Fuzzy matching OK (70%+)
  fuzzyMatchFields: {
    fields: ['classType', 'countryOfOrigin', 'appellation'],
    threshold: 0.70,
  },
  
  // Brand name special handling (Dave's concern)
  brandName: {
    exactMatchThreshold: 1.0,
    highSimilarityThreshold: 0.90,  // Accept with notes
    reviewThreshold: 0.70,           // Flag for review
    rejectThreshold: 0.50,           // Definite mismatch
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// ALCOHOL CONTENT VALIDATION
// ═══════════════════════════════════════════════════════════════════════════
export const ALCOHOL_CONTENT_RULES = {
  // TTB tolerances per 27 CFR
  tolerances: {
    distilled_spirits: {
      standard: 0.3,    // ±0.3% for spirits 100 proof and under
      highProof: 0.15,  // ±0.15% for spirits over 100 proof
      highProofThreshold: 50, // ABV above which highProof tolerance applies
    },
    wine: {
      tableWine: 1.5,   // ±1.5% for wines 14% and under
      dessertWine: 1.0, // ±1.0% for wines over 14%
      threshold: 14,    // ABV dividing line
    },
    beer: {
      standard: 0.3,    // ±0.3% if ABV is stated
    },
  },
  
  // Valid ABV ranges by beverage type
  validRanges: {
    distilled_spirits: { min: 20, max: 95 },
    wine: { min: 0.5, max: 24 },
    beer: { min: 0.5, max: 15 },
  },
  
  // Valid format patterns
  validFormats: [
    /^\d{1,2}(\.\d{1,2})?\s*%\s*(alc\.?\/vol\.?|abv|alcohol\s*by\s*volume)/i,
    /^\d{2,3}\s*proof/i,
  ],
  
  // Invalid formats (bare percentage without qualifier)
  invalidFormats: [
    /^(\d+(?:\.\d+)?)\s*%$/,  // Just "45%" without Alc./Vol. or ABV
  ],
};

// ═══════════════════════════════════════════════════════════════════════════
// GOVERNMENT WARNING VALIDATION
// ═══════════════════════════════════════════════════════════════════════════
export const GOVERNMENT_WARNING_RULES = {
  // Minimum similarity to required text
  minSimilarity: 0.95,
  
  // Prefix must be exactly this
  requiredPrefix: 'GOVERNMENT WARNING:',
  
  // Required phrases that MUST appear (for partial matching)
  requiredPhrases: [
    'government warning',
    'surgeon general',
    'women should not drink',
    'pregnancy',
    'birth defects',
    'impairs your ability',
    'drive a car',
    'operate machinery',
    'health problems',
  ],
  
  // Common errors to detect
  commonErrors: {
    titleCase: 'Government Warning:', // Wrong - must be ALL CAPS
    lowercase: 'government warning:',  // Wrong - must be ALL CAPS
    missingColon: 'GOVERNMENT WARNING', // Wrong - must include colon
  },
  
  // Formatting requirements
  formatting: {
    prefixMustBeAllCaps: true,
    prefixMustBeBold: true, // Note: can't always verify via OCR
    mustBeConspicuous: true,
    mustBeSeparate: true,
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// IMAGE QUALITY CONSTRAINTS
// ═══════════════════════════════════════════════════════════════════════════
export const IMAGE_QUALITY_RULES = {
  // Minimum acceptable quality score
  minAcceptableScore: 0.60,
  
  // Score thresholds
  thresholds: {
    excellent: 0.90,
    good: 0.75,
    acceptable: 0.60,
    poor: 0.40, // Recommend resubmit below this
  },
  
  // Issues that should trigger resubmit recommendation
  criticalIssues: ['blur', 'low_resolution', 'text_cut_off', 'partial_occlusion'] as ImageQualityIssue[],
  
  // Issues that are warnings but not blockers
  warningIssues: ['glare', 'angle_distortion', 'poor_lighting'] as ImageQualityIssue[],
  
  // Minimum image dimensions
  minDimensions: {
    width: 640,
    height: 480,
  },
  
  // Maximum file size
  maxFileSizeMb: 10,
  
  // Supported formats
  supportedFormats: ['image/jpeg', 'image/png', 'image/webp'],
};

// ═══════════════════════════════════════════════════════════════════════════
// AUTO-APPROVAL / REJECTION CONDITIONS
// ═══════════════════════════════════════════════════════════════════════════
export const DECISION_RULES = {
  // ALL of these must be true for auto-approval
  autoApprovalConditions: [
    'allMandatoryFieldsMatch',
    'governmentWarningCorrect',
    'overallConfidenceAboveThreshold',
    'noImageQualityIssues',
    'alcoholContentWithinTolerance',
  ],
  
  // ANY of these triggers auto-rejection
  autoRejectionConditions: [
    'governmentWarningMissing',
    'governmentWarningPrefixNotAllCaps',
    'governmentWarningTextIncorrect',
    'brandNameCompleteMismatch',
    'alcoholContentOutsideTolerance',
    'overallConfidenceBelowMinimum',
  ],
  
  // ANY of these triggers human review (instead of auto-reject)
  humanReviewTriggers: [
    'brandNameSimilarButNotExact',      // Dave's concern
    'lowConfidenceScore',
    'imageQualityIssues',
    'classTypeMismatch',
    'producerNameMismatch',
    'nonStandardContainerSize',
    'missingOptionalFields',
    'moderateConfidenceWithIssues',
  ],
  
  // Critical fields - mismatch = rejection
  criticalFields: ['brandName', 'alcoholContent', 'governmentWarning'],
  
  // Important fields - mismatch = review
  importantFields: ['classType', 'netContents', 'producerName'],
  
  // Informational fields - mismatch = note only
  informationalFields: ['fancifulName', 'appellation', 'vintageYear'],
};

// ═══════════════════════════════════════════════════════════════════════════
// OCR ERROR PATTERNS
// ═══════════════════════════════════════════════════════════════════════════
export const OCR_ERROR_PATTERNS = {
  // Common character confusions in OCR
  characterSubstitutions: [
    { from: '0', to: 'O' },
    { from: 'O', to: '0' },
    { from: '1', to: 'l' },
    { from: '1', to: 'I' },
    { from: 'l', to: '1' },
    { from: 'I', to: '1' },
    { from: '5', to: 'S' },
    { from: 'S', to: '5' },
    { from: '8', to: 'B' },
    { from: 'B', to: '8' },
    { from: 'rn', to: 'm' },
    { from: 'm', to: 'rn' },
  ],
  
  // Possessive handling (Stone's vs Stones)
  possessiveNormalization: true,
  
  // Smart quote normalization
  normalizeQuotes: true,
  
  // Whitespace normalization
  normalizeWhitespace: true,
};

// ═══════════════════════════════════════════════════════════════════════════
// NET CONTENTS VALIDATION
// ═══════════════════════════════════════════════════════════════════════════
export const NET_CONTENTS_RULES = {
  // Metric required for these beverage types
  metricRequired: ['wine', 'distilled_spirits'] as BeverageType[],
  
  // Imperial allowed for these beverage types
  imperialAllowed: ['beer'] as BeverageType[],
  
  // Tolerance for numeric comparison (1%)
  tolerance: 0.01,
  
  // Standard fill sizes by type (mL)
  standardSizes: {
    distilled_spirits: [50, 100, 200, 375, 750, 1000, 1750],
    wine: [187, 375, 500, 750, 1000, 1500, 3000],
    beer: [355, 473, 650, 946], // 12oz, 16oz, 22oz, 32oz in mL
  },
  
  // Flag non-standard sizes for review
  flagNonStandardSizes: true,
};

// ═══════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Get the appropriate alcohol tolerance for a beverage type and ABV
 */
export function getAlcoholTolerance(beverageType: BeverageType, abv: number): number {
  const rules = ALCOHOL_CONTENT_RULES.tolerances;
  
  switch (beverageType) {
    case 'distilled_spirits':
      return abv > rules.distilled_spirits.highProofThreshold
        ? rules.distilled_spirits.highProof
        : rules.distilled_spirits.standard;
    case 'wine':
      return abv > rules.wine.threshold
        ? rules.wine.dessertWine
        : rules.wine.tableWine;
    case 'beer':
      return rules.beer.standard;
    default:
      return 0.3; // Default tolerance
  }
}

/**
 * Check if an ABV is within the valid range for a beverage type
 */
export function isValidAbvRange(beverageType: BeverageType, abv: number): boolean {
  const range = ALCOHOL_CONTENT_RULES.validRanges[beverageType];
  return abv >= range.min && abv <= range.max;
}

/**
 * Check if a net contents value is a standard fill size
 */
export function isStandardFillSize(beverageType: BeverageType, volumeMl: number): boolean {
  const standardSizes = NET_CONTENTS_RULES.standardSizes[beverageType] || [];
  // Allow 5mL tolerance for rounding
  return standardSizes.some(size => Math.abs(size - volumeMl) < 5);
}

/**
 * Determine the minimum required type size for government warning
 * based on container size
 */
export function getRequiredWarningTypeSize(containerVolumeMl: number): number {
  if (containerVolumeMl <= 237) return 1; // 1mm for ≤8 fl oz
  if (containerVolumeMl < 3000) return 2; // 2mm for 8 fl oz to 3L
  return 3; // 3mm for ≥3L
}

/**
 * Apply OCR error correction patterns
 */
export function normalizeForOcrErrors(text: string): string {
  let normalized = text.toLowerCase();
  
  // Normalize whitespace
  if (OCR_ERROR_PATTERNS.normalizeWhitespace) {
    normalized = normalized.replace(/\s+/g, ' ').trim();
  }
  
  // Normalize quotes
  if (OCR_ERROR_PATTERNS.normalizeQuotes) {
    normalized = normalized
      .replace(/[\u2018\u2019\u0027\u0060\u00B4]/g, "'")
      .replace(/[\u201C\u201D]/g, '"');
  }
  
  // Normalize possessives (Stone's -> stones)
  if (OCR_ERROR_PATTERNS.possessiveNormalization) {
    normalized = normalized.replace(/'s\b/g, 's');
  }
  
  return normalized;
}

/**
 * Check if two strings are semantically equivalent after OCR normalization
 */
export function areSemanticallySimilar(str1: string, str2: string): boolean {
  const norm1 = normalizeForOcrErrors(str1);
  const norm2 = normalizeForOcrErrors(str2);
  
  if (norm1 === norm2) return true;
  
  // Try OCR character substitutions
  let testStr = norm1;
  for (const sub of OCR_ERROR_PATTERNS.characterSubstitutions) {
    testStr = testStr.replace(new RegExp(sub.from, 'gi'), sub.to.toLowerCase());
    if (testStr === norm2) return true;
  }
  
  return false;
}

