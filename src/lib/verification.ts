/**
 * TTB Label Verification Logic
 * 
 * Implements field-by-field comparison between COLA application data
 * and extracted label data, with TTB-compliant tolerance thresholds.
 * 
 * Key principles (per stakeholder interviews):
 * - NO false positives (Marcus/Dave): Reject uncertain matches
 * - Handle minor variations (Dave): "STONE'S THROW" vs "Stone's Throw"
 * - Exact government warning (Jenny): ALL CAPS prefix, exact text
 * - Flag for human review when uncertain
 */

import { 
  ApplicationData, 
  ExtractedLabelData, 
  VerificationResult, 
  FieldVerification,
  VerificationStatus,
  BeverageType,
  GOVERNMENT_WARNING_TEXT,
  GOVERNMENT_WARNING_REQUIRED_PHRASES,
  ALCOHOL_CONTENT_PATTERNS,
  NET_CONTENTS_PATTERNS,
} from '@/types';
import { v4 as uuidv4 } from 'uuid';
import { 
  CONFIDENCE_THRESHOLDS,
  MATCHING_THRESHOLDS,
  GOVERNMENT_WARNING_RULES,
  PROCESSING_CONSTRAINTS,
  getAlcoholTolerance,
  isStandardFillSize,
  areSemanticallySimilar
} from './constraints';

// ═══════════════════════════════════════════════════════════════════════════
// TEXT NORMALIZATION & SIMILARITY
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Normalize text for comparison by removing extra whitespace,
 * converting to lowercase, and handling common variations
 */
export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[\u2018\u2019\u0027\u0060\u00B4]/g, "'") // Normalize quotes
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/–/g, '-') // Normalize dashes
    .replace(/…/g, '...')
    .trim();
}

/**
 * Calculate string similarity using Levenshtein distance
 * Returns a score between 0 and 1
 */
export function stringSimilarity(str1: string, str2: string): number {
  const s1 = normalizeText(str1);
  const s2 = normalizeText(str2);
  
  if (s1 === s2) return 1.0;
  if (s1.length === 0 || s2.length === 0) return 0.0;
  
  // Calculate Levenshtein distance
  const matrix: number[][] = [];
  
  for (let i = 0; i <= s1.length; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= s2.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= s1.length; i++) {
    for (let j = 1; j <= s2.length; j++) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,      // deletion
        matrix[i][j - 1] + 1,      // insertion
        matrix[i - 1][j - 1] + cost // substitution
      );
    }
  }
  
  const distance = matrix[s1.length][s2.length];
  const maxLength = Math.max(s1.length, s2.length);
  
  return 1 - (distance / maxLength);
}

// ═══════════════════════════════════════════════════════════════════════════
// BRAND NAME COMPARISON
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Check if brand names match, accounting for case variations
 * and minor formatting differences (Dave's concern: "STONE'S THROW" vs "Stone's Throw")
 */
export function compareBrandNames(
  applicationName: string, 
  labelName: string
): { matches: boolean; confidence: number; notes?: string } {
  // First check for semantic equivalence (handles OCR errors and possessives)
  if (areSemanticallySimilar(applicationName, labelName)) {
    return { matches: true, confidence: 1.0 };
  }
  
  const similarity = stringSimilarity(applicationName, labelName);
  const thresholds = MATCHING_THRESHOLDS.brandName;
  
  // Exact match (case-insensitive)
  if (similarity >= thresholds.exactMatchThreshold) {
    return { matches: true, confidence: 1.0 };
  }
  
  // High similarity - likely the same with minor differences
  if (similarity >= thresholds.highSimilarityThreshold) {
    return { 
      matches: true, 
      confidence: similarity,
      notes: `Minor difference detected: "${applicationName}" vs "${labelName}"`
    };
  }
  
  // Medium similarity - flag for review (Dave's edge case)
  if (similarity >= thresholds.reviewThreshold) {
    return {
      matches: false,
      confidence: similarity,
      notes: `Possible match requiring review: "${applicationName}" vs "${labelName}"`
    };
  }
  
  // Low similarity - definite mismatch
  return {
    matches: false,
    confidence: similarity,
    notes: `Mismatch: "${applicationName}" vs "${labelName}"`
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// ALCOHOL CONTENT COMPARISON
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Parse and normalize alcohol content for comparison
 */
export function parseAlcoholContent(content: string): { percentage: number | null; proof: number | null } {
  const percentMatch = content.match(ALCOHOL_CONTENT_PATTERNS.percentage);
  const proofMatch = content.match(ALCOHOL_CONTENT_PATTERNS.proof);
  
  return {
    percentage: percentMatch ? parseFloat(percentMatch[1]) : null,
    proof: proofMatch ? parseInt(proofMatch[1], 10) : null
  };
}

/**
 * Compare alcohol content values with TTB tolerances
 * per 27 CFR (±0.3% for spirits ≤100 proof, ±0.15% for >100 proof, etc.)
 */
export function compareAlcoholContent(
  applicationContent: string, 
  labelContent: string,
  beverageType: BeverageType = 'distilled_spirits'
): { matches: boolean; confidence: number; notes?: string } {
  const appParsed = parseAlcoholContent(applicationContent);
  const labelParsed = parseAlcoholContent(labelContent);
  
  // Compare by percentage if available
  if (appParsed.percentage !== null && labelParsed.percentage !== null) {
    const diff = Math.abs(appParsed.percentage - labelParsed.percentage);
    
    // Exact match
    if (diff === 0) {
      return { matches: true, confidence: 1.0 };
    }
    
    // Get TTB tolerance for this beverage type and ABV
    const tolerance = getAlcoholTolerance(beverageType, appParsed.percentage);
    
    if (diff <= tolerance) {
      return { 
        matches: true, 
        confidence: 1 - (diff / tolerance) * 0.1, // Slight confidence reduction
        notes: diff > 0.05 
          ? `Within TTB tolerance (±${tolerance}%): ${appParsed.percentage}% vs ${labelParsed.percentage}%`
          : undefined
      };
    }
    
    return {
      matches: false,
      confidence: 0.0,
      notes: `Alcohol content mismatch: ${appParsed.percentage}% vs ${labelParsed.percentage}% (exceeds ±${tolerance}% tolerance)`
    };
  }
  
  // Compare by proof if available
  if (appParsed.proof !== null && labelParsed.proof !== null) {
    const proofDiff = Math.abs(appParsed.proof - labelParsed.proof);
    
    if (proofDiff === 0) {
      return { matches: true, confidence: 1.0 };
    }
    
    // Allow 1 proof point for rounding
    if (proofDiff <= 1) {
      return {
        matches: true,
        confidence: 0.95,
        notes: `Minor proof difference: ${appParsed.proof} vs ${labelParsed.proof}`
      };
    }
    
    return {
      matches: false,
      confidence: 0.0,
      notes: `Proof mismatch: ${appParsed.proof} vs ${labelParsed.proof}`
    };
  }
  
  // Fall back to string comparison
  const similarity = stringSimilarity(applicationContent, labelContent);
  return {
    matches: similarity >= 0.9,
    confidence: similarity,
    notes: similarity < 0.9 ? `Could not parse alcohol content for comparison` : undefined
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// NET CONTENTS COMPARISON
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Parse and normalize net contents for comparison
 */
export function parseNetContents(contents: string): { value: number | null; unit: string | null; originalUnit?: string } {
  const metricMatch = contents.match(NET_CONTENTS_PATTERNS.metric);
  const imperialMatch = contents.match(NET_CONTENTS_PATTERNS.imperial);
  
  if (metricMatch) {
    let value = parseFloat(metricMatch[1]);
    const unit = metricMatch[2].toLowerCase();
    
    // Only convert if explicitly liters (not milliliters)
    if ((unit === 'l' || unit === 'liter' || unit === 'liters') && !unit.includes('milli')) {
      value *= 1000;
    }
    
    return { value, unit: 'ml', originalUnit: metricMatch[2] };
  }
  
  if (imperialMatch) {
    const value = parseFloat(imperialMatch[1]);
    return { value, unit: 'fl oz', originalUnit: imperialMatch[2] };
  }
  
  return { value: null, unit: null };
}

/**
 * Compare net contents values
 */
export function compareNetContents(
  applicationContents: string,
  labelContents: string,
  beverageType: BeverageType = 'distilled_spirits'
): { matches: boolean; confidence: number; notes?: string } {
  const appParsed = parseNetContents(applicationContents);
  const labelParsed = parseNetContents(labelContents);
  
  if (appParsed.value !== null && labelParsed.value !== null) {
    // Same unit comparison
    if (appParsed.unit === labelParsed.unit) {
      if (appParsed.value === labelParsed.value) {
        // Check if standard fill size
        const valueMl = appParsed.unit === 'ml' ? appParsed.value : appParsed.value * 29.5735;
        const isStandard = isStandardFillSize(beverageType, valueMl);
        
        return { 
          matches: true, 
          confidence: 1.0,
          notes: !isStandard ? `Non-standard container size: ${applicationContents}` : undefined
        };
      }
      
      // Allow small tolerance (1%)
      const diff = Math.abs(appParsed.value - labelParsed.value);
      const tolerance = appParsed.value * 0.01;
      
      if (diff <= tolerance) {
        return {
          matches: true,
          confidence: 0.95,
          notes: `Minor net contents difference: ${appParsed.value} vs ${labelParsed.value} ${appParsed.unit}`
        };
      }
    }
    
    // Convert to common unit for comparison if different units
    const appMl = appParsed.unit === 'fl oz' ? appParsed.value * 29.5735 : appParsed.value;
    const labelMl = labelParsed.unit === 'fl oz' ? labelParsed.value * 29.5735 : labelParsed.value;
    
    if (Math.abs(appMl - labelMl) < 5) { // 5mL tolerance for unit conversion
      return {
        matches: true,
        confidence: 0.90,
        notes: `Matched after unit conversion: ${applicationContents} ≈ ${labelContents}`
      };
    }
    
    return {
      matches: false,
      confidence: 0.0,
      notes: `Net contents mismatch: ${applicationContents} vs ${labelContents}`
    };
  }
  
  // Fall back to string comparison
  const similarity = stringSimilarity(applicationContents, labelContents);
  return {
    matches: similarity >= 0.9,
    confidence: similarity
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// GOVERNMENT WARNING VALIDATION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Validate government warning text
 * Must be EXACT and "GOVERNMENT WARNING:" must be in ALL CAPS
 * (Jenny's concern - caught one with title case instead of ALL CAPS)
 */
export function validateGovernmentWarning(
  warningText: string | undefined
): { present: boolean; correct: boolean; notes?: string; issues?: string[] } {
  const issues: string[] = [];
  
  if (!warningText || warningText.trim().length === 0) {
    return {
      present: false,
      correct: false,
      notes: 'Government warning not found on label',
      issues: ['Government warning text not found']
    };
  }
  
  // Check if "GOVERNMENT WARNING:" is in all caps (Jenny's specific concern)
  if (!warningText.includes('GOVERNMENT WARNING:')) {
    if (warningText.toLowerCase().includes('government warning')) {
      // Found warning but wrong case
      if (warningText.includes('Government Warning:')) {
        issues.push('"GOVERNMENT WARNING:" must be in ALL CAPS (found "Government Warning:" in title case)');
      } else if (warningText.includes('government warning:')) {
        issues.push('"GOVERNMENT WARNING:" must be in ALL CAPS (found lowercase)');
      } else if (warningText.includes('GOVERNMENT WARNING') && !warningText.includes('GOVERNMENT WARNING:')) {
        issues.push('Missing colon after "GOVERNMENT WARNING"');
      } else {
        issues.push('"GOVERNMENT WARNING:" must be in ALL CAPS');
      }
      
      return {
        present: true,
        correct: false,
        notes: issues[0],
        issues
      };
    }
    
    return {
      present: false,
      correct: false,
      notes: 'Government warning prefix not found',
      issues: ['Government warning prefix "GOVERNMENT WARNING:" not found']
    };
  }
  
  // Normalize for content comparison
  const normalizedWarning = normalizeText(warningText);
  const normalizedRequired = normalizeText(GOVERNMENT_WARNING_TEXT);
  
  // Check for required phrases
  const missingPhrases: string[] = [];
  for (const phrase of GOVERNMENT_WARNING_REQUIRED_PHRASES) {
    if (!normalizedWarning.includes(phrase.toLowerCase())) {
      missingPhrases.push(phrase);
    }
  }
  
  if (missingPhrases.length > 0) {
    issues.push(`Missing required phrases: ${missingPhrases.slice(0, 3).join(', ')}${missingPhrases.length > 3 ? '...' : ''}`);
  }
  
  const similarity = stringSimilarity(normalizedWarning, normalizedRequired);
  
  if (similarity >= GOVERNMENT_WARNING_RULES.minSimilarity) {
    return { 
      present: true, 
      correct: true,
      issues: issues.length > 0 ? issues : undefined
    };
  }
  
  if (similarity >= 0.85) {
    issues.push(`Warning text ${(similarity * 100).toFixed(0)}% similar to required text`);
    return {
      present: true,
      correct: false,
      notes: 'Government warning text differs slightly from required text',
      issues
    };
  }
  
  if (similarity >= 0.70) {
    issues.push(`Warning text only ${(similarity * 100).toFixed(0)}% similar to required text`);
    return {
      present: true,
      correct: false,
      notes: 'Government warning text differs from required text',
      issues
    };
  }
  
  issues.push(`Warning text significantly different (${(similarity * 100).toFixed(0)}% match)`);
  return {
    present: true,
    correct: false,
    notes: 'Government warning text significantly differs from required text',
    issues
  };
}

/**
 * Enhanced government warning validation with detailed analysis
 */
export function validateGovernmentWarningEnhanced(
  extractedData: ExtractedLabelData
): { 
  present: boolean; 
  correct: boolean; 
  issues: string[];
  confidence: number;
} {
  const warningText = extractedData.governmentWarning;
  const warningDetails = extractedData.governmentWarningDetails;
  const issues: string[] = [];
  
  // Basic validation
  const basicResult = validateGovernmentWarning(warningText);
  if (basicResult.issues) {
    issues.push(...basicResult.issues);
  }
  
  if (!basicResult.present) {
    return {
      present: false,
      correct: false,
      issues: issues.length > 0 ? issues : ['Government warning not found'],
      confidence: 0
    };
  }
  
  // Check additional details from AI extraction if available
  if (warningDetails) {
    if (!warningDetails.prefixInAllCaps) {
      if (!issues.some(i => i.includes('ALL CAPS'))) {
        issues.push('"GOVERNMENT WARNING:" prefix not in ALL CAPS');
      }
    }
    
    if (warningDetails.appearsBold === false) {
      issues.push('"GOVERNMENT WARNING:" should be in bold type (flagged for review)');
    }
    
    if (!warningDetails.textComplete) {
      issues.push('Government warning text appears incomplete');
    }
    
    if (warningDetails.issues && warningDetails.issues.length > 0) {
      issues.push(...warningDetails.issues.filter(i => !issues.includes(i)));
    }
  }
  
  // Calculate confidence based on similarity
  const normalizedWarning = normalizeText(warningText || '');
  const normalizedRequired = normalizeText(GOVERNMENT_WARNING_TEXT);
  const similarity = stringSimilarity(normalizedWarning, normalizedRequired);
  
  return {
    present: basicResult.present,
    correct: basicResult.correct && issues.length === 0,
    issues,
    confidence: similarity
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// FIELD VERIFICATION HELPERS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Compare a single field between application and extracted label data
 */
function verifyField(
  fieldName: string,
  applicationValue: string | undefined,
  labelValue: string | undefined,
  compareFn: (app: string, label: string) => { matches: boolean; confidence: number; notes?: string }
): FieldVerification {
  if (!applicationValue) {
    return {
      field: fieldName,
      applicationValue: '',
      labelValue: labelValue,
      matches: true,
      confidence: 1.0,
      notes: 'Field not specified in application'
    };
  }
  
  if (!labelValue) {
    return {
      field: fieldName,
      applicationValue: applicationValue,
      labelValue: undefined,
      matches: false,
      confidence: 0.0,
      notes: 'Field not found on label'
    };
  }
  
  const result = compareFn(applicationValue, labelValue);
  
  return {
    field: fieldName,
    applicationValue,
    labelValue,
    ...result
  };
}

/**
 * Generic string comparison with threshold
 */
function compareStrings(
  app: string, 
  label: string, 
  threshold: number
): { matches: boolean; confidence: number; notes?: string } {
  const similarity = stringSimilarity(app, label);
  return {
    matches: similarity >= threshold,
    confidence: similarity,
    notes: similarity < threshold ? `Values differ: "${app}" vs "${label}"` : undefined
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN VERIFICATION FUNCTION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Main verification function that compares application data with extracted label data
 * 
 * Philosophy (per Marcus/Dave): 
 * - False negatives are OK (flag for human review)
 * - NO false positives (never auto-approve uncertain matches)
 */
export function verifyLabel(
  applicationData: ApplicationData,
  extractedData: ExtractedLabelData,
  processingTimeMs: number
): VerificationResult {
  const fieldVerifications: FieldVerification[] = [];
  const flaggedIssues: string[] = [];
  const humanReviewReasons: string[] = [];
  const beverageType = applicationData.beverageType;
  
  // ─────────────────────────────────────────────────────────────────────────
  // FIELD COMPARISONS
  // ─────────────────────────────────────────────────────────────────────────
  
  // Compare brand name (critical field)
  const brandNameVerification = verifyField(
    'Brand Name',
    applicationData.brandName,
    extractedData.brandName,
    compareBrandNames
  );
  fieldVerifications.push(brandNameVerification);
  
  if (!brandNameVerification.matches) {
    if (brandNameVerification.confidence >= MATCHING_THRESHOLDS.brandName.reviewThreshold) {
      humanReviewReasons.push(`Brand name requires review: similar but not exact match (${(brandNameVerification.confidence * 100).toFixed(0)}% similar)`);
    } else {
      flaggedIssues.push('Brand name mismatch');
    }
  }
  
  // Compare class/type
  const classTypeVerification = verifyField(
    'Class/Type',
    applicationData.classType,
    extractedData.classType,
    (app, label) => compareStrings(app, label, 0.85)
  );
  fieldVerifications.push(classTypeVerification);
  
  if (!classTypeVerification.matches) {
    if (classTypeVerification.confidence >= 0.70) {
      humanReviewReasons.push('Class/type requires review');
    } else {
      flaggedIssues.push('Class/type mismatch');
    }
  }
  
  // Compare alcohol content (critical field) with TTB tolerances
  const alcoholVerification = verifyField(
    'Alcohol Content',
    applicationData.alcoholContent,
    extractedData.alcoholContent,
    (app, label) => compareAlcoholContent(app, label, beverageType)
  );
  fieldVerifications.push(alcoholVerification);
  
  if (!alcoholVerification.matches) {
    flaggedIssues.push('Alcohol content mismatch');
  }
  
  // Compare net contents
  const netContentsVerification = verifyField(
    'Net Contents',
    applicationData.netContents,
    extractedData.netContents,
    (app, label) => compareNetContents(app, label, beverageType)
  );
  fieldVerifications.push(netContentsVerification);
  
  if (!netContentsVerification.matches) {
    flaggedIssues.push('Net contents mismatch');
  }
  
  // Check for non-standard fill size
  if (applicationData.netContents) {
    const parsed = parseNetContents(applicationData.netContents);
    if (parsed.value) {
      const valueMl = parsed.unit === 'fl oz' ? parsed.value * 29.5735 : parsed.value;
      if (!isStandardFillSize(beverageType, valueMl)) {
        humanReviewReasons.push(`Non-standard container size: ${applicationData.netContents}`);
      }
    }
  }
  
  // Compare producer name
  const producerVerification = verifyField(
    'Producer Name',
    applicationData.producerName,
    extractedData.producerName,
    (app, label) => compareStrings(app, label, 0.80)
  );
  fieldVerifications.push(producerVerification);
  
  if (!producerVerification.matches) {
    if (producerVerification.confidence >= 0.60) {
      humanReviewReasons.push('Producer name requires review');
    } else {
      flaggedIssues.push('Producer name mismatch');
    }
  }
  
  // Compare country of origin (if applicable for imports)
  if (applicationData.countryOfOrigin) {
    const countryVerification = verifyField(
      'Country of Origin',
      applicationData.countryOfOrigin,
      extractedData.countryOfOrigin,
      (app, label) => compareStrings(app, label, 0.90)
    );
    fieldVerifications.push(countryVerification);
    
    if (!countryVerification.matches) {
      flaggedIssues.push('Country of origin mismatch');
    }
  }
  
  // Wine-specific: Compare vintage year
  if (beverageType === 'wine' && applicationData.vintageYear) {
    const vintageVerification = verifyField(
      'Vintage Year',
      applicationData.vintageYear,
      extractedData.vintageYear,
      (app, label) => ({
        matches: app === label,
        confidence: app === label ? 1.0 : 0.0,
        notes: app !== label ? `Vintage year mismatch: ${app} vs ${label}` : undefined
      })
    );
    fieldVerifications.push(vintageVerification);
    
    if (!vintageVerification.matches) {
      flaggedIssues.push('Vintage year mismatch');
    }
  }
  
  // Wine-specific: Compare appellation
  if (beverageType === 'wine' && applicationData.appellation) {
    const appellationVerification = verifyField(
      'Appellation',
      applicationData.appellation,
      extractedData.appellation,
      (app, label) => compareStrings(app, label, 0.85)
    );
    fieldVerifications.push(appellationVerification);
    
    if (!appellationVerification.matches) {
      humanReviewReasons.push('Appellation requires review');
    }
  }
  
  // ─────────────────────────────────────────────────────────────────────────
  // GOVERNMENT WARNING VALIDATION
  // ─────────────────────────────────────────────────────────────────────────
  
  const warningValidation = validateGovernmentWarningEnhanced(extractedData);
  const governmentWarningIssues = warningValidation.issues;
  
  if (!warningValidation.present) {
    flaggedIssues.push('Government warning not present');
  } else if (!warningValidation.correct) {
    if (warningValidation.confidence >= 0.85) {
      humanReviewReasons.push('Government warning requires review: minor formatting issues');
      flaggedIssues.push('Government warning format/text issue');
    } else {
      flaggedIssues.push('Government warning format/text incorrect');
    }
  }
  
  // ─────────────────────────────────────────────────────────────────────────
  // IMAGE QUALITY CHECK
  // ─────────────────────────────────────────────────────────────────────────
  
  const imageQuality = extractedData.imageQuality;
  if (imageQuality) {
    if (imageQuality.recommendResubmit) {
      humanReviewReasons.push(`Image quality issues: ${imageQuality.issues.join(', ')}`);
    } else if (imageQuality.issues.length > 0 && imageQuality.overallScore < 0.70) {
      humanReviewReasons.push(`Low image quality may affect accuracy (${(imageQuality.overallScore * 100).toFixed(0)}%)`);
    }
  }
  
  // ─────────────────────────────────────────────────────────────────────────
  // CALCULATE OVERALL RESULTS
  // ─────────────────────────────────────────────────────────────────────────
  
  const matchedFields = fieldVerifications.filter(f => f.matches).length;
  const totalFields = fieldVerifications.length;
  
  // Calculate average field confidence
  const avgFieldConfidence = fieldVerifications.reduce((sum, f) => sum + f.confidence, 0) / totalFields;
  
  // Overall confidence is minimum of field confidence and extraction confidence
  const overallConfidence = Math.min(avgFieldConfidence, extractedData.confidence);
  
  // ─────────────────────────────────────────────────────────────────────────
  // DETERMINE VERIFICATION STATUS
  // ─────────────────────────────────────────────────────────────────────────
  
  // IMPORTANT: False negatives OK, but NO false positives (per Marcus)
  let status: VerificationStatus;
  let requiresHumanReview = humanReviewReasons.length > 0;
  
  // Critical failures that prevent approval
  const criticalFailures = [
    !warningValidation.present,
    !warningValidation.correct && warningValidation.confidence < 0.85,
    !fieldVerifications.find(f => f.field === 'Brand Name')?.matches && 
      (fieldVerifications.find(f => f.field === 'Brand Name')?.confidence ?? 0) < MATCHING_THRESHOLDS.brandName.reviewThreshold,
    !fieldVerifications.find(f => f.field === 'Alcohol Content')?.matches,
  ];
  
  const hasCriticalFailure = criticalFailures.some(f => f);
  
  if (hasCriticalFailure) {
    // Check if it should be reviewed vs rejected
    if (overallConfidence >= CONFIDENCE_THRESHOLDS.medium && humanReviewReasons.length > 0) {
      status = 'needs_review';
      requiresHumanReview = true;
      if (!humanReviewReasons.some(r => r.includes('Critical'))) {
        humanReviewReasons.push('Critical fields may have issues but confidence is moderate');
      }
    } else {
      status = 'rejected';
    }
  } else if (
    matchedFields === totalFields && 
    warningValidation.correct && 
    overallConfidence >= CONFIDENCE_THRESHOLDS.autoApprovalMinimum &&
    humanReviewReasons.length === 0
  ) {
    // Perfect match with high confidence and no review triggers
    status = 'approved';
  } else if (
    overallConfidence < CONFIDENCE_THRESHOLDS.humanReviewThreshold || 
    humanReviewReasons.length > 0
  ) {
    // Flag for human review
    status = 'needs_review';
    requiresHumanReview = true;
    if (overallConfidence < CONFIDENCE_THRESHOLDS.humanReviewThreshold) {
      if (!humanReviewReasons.some(r => r.includes('confidence'))) {
        humanReviewReasons.push(`Low confidence score: ${(overallConfidence * 100).toFixed(1)}%`);
      }
    }
  } else if (matchedFields >= totalFields * 0.8 && warningValidation.correct) {
    // Most fields match but some concerns
    status = 'needs_review';
    requiresHumanReview = true;
    humanReviewReasons.push('Some fields require human verification');
  } else {
    status = 'rejected';
  }
  
  // ─────────────────────────────────────────────────────────────────────────
  // BUILD RESULT
  // ─────────────────────────────────────────────────────────────────────────
  
  // Check if we met Sarah's 5-second target
  const meetsTargetTime = processingTimeMs <= PROCESSING_CONSTRAINTS.targetTimeMs;
  
  return {
    id: uuidv4(),
    timestamp: new Date().toISOString(),
    status,
    overallConfidence,
    processingTimeMs,
    fieldVerifications,
    governmentWarningPresent: warningValidation.present,
    governmentWarningCorrect: warningValidation.correct,
    governmentWarningNotes: warningValidation.issues.length > 0 ? warningValidation.issues[0] : undefined,
    governmentWarningIssues,
    extractedData,
    matchedFields,
    totalFields,
    flaggedIssues,
    requiresHumanReview,
    humanReviewReasons,
    imageQualityScore: imageQuality?.overallScore,
    imageQualityIssues: imageQuality?.issues,
    meetsTargetTime,
  };
}
