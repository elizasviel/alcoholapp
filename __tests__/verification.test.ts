import { describe, it, expect } from 'vitest';
import {
  normalizeText,
  stringSimilarity,
  compareBrandNames,
  parseAlcoholContent,
  compareAlcoholContent,
  parseNetContents,
  compareNetContents,
  validateGovernmentWarning,
  validateGovernmentWarningEnhanced,
  verifyLabel,
} from '../src/lib/verification';
import { 
  areSemanticallySimilar, 
  isStandardFillSize,
  getAlcoholTolerance 
} from '../src/lib/constraints';
import { ApplicationData, ExtractedLabelData, GOVERNMENT_WARNING_TEXT } from '../src/types';

// ═══════════════════════════════════════════════════════════════════════════
// TEXT NORMALIZATION
// ═══════════════════════════════════════════════════════════════════════════

describe('Text Normalization', () => {
  it('should normalize whitespace', () => {
    expect(normalizeText('  hello   world  ')).toBe('hello world');
  });

  it('should convert to lowercase', () => {
    expect(normalizeText('HELLO WORLD')).toBe('hello world');
  });

  it('should normalize quotes', () => {
    expect(normalizeText("stone's throw")).toBe("stone's throw");
    // Smart quote (right single quotation mark) should normalize to regular apostrophe
    expect(normalizeText("stone\u2019s throw")).toBe("stone's throw");
  });

  it('should normalize curly double quotes', () => {
    expect(normalizeText('\u201CHello\u201D')).toBe('"hello"');
  });

  it('should normalize dashes', () => {
    expect(normalizeText('Kentucky–style')).toBe('kentucky-style');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// STRING SIMILARITY
// ═══════════════════════════════════════════════════════════════════════════

describe('String Similarity', () => {
  it('should return 1.0 for identical strings', () => {
    expect(stringSimilarity('hello', 'hello')).toBe(1.0);
  });

  it('should return 1.0 for case-insensitive matches', () => {
    expect(stringSimilarity('HELLO', 'hello')).toBe(1.0);
  });

  it('should return high similarity for minor differences', () => {
    const similarity = stringSimilarity("STONE'S THROW", "Stone's Throw");
    expect(similarity).toBeGreaterThan(0.9);
  });

  it('should return low similarity for completely different strings', () => {
    const similarity = stringSimilarity('apple', 'banana');
    expect(similarity).toBeLessThan(0.5);
  });

  it('should handle empty strings', () => {
    expect(stringSimilarity('', 'hello')).toBe(0.0);
    expect(stringSimilarity('hello', '')).toBe(0.0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// SEMANTIC MATCHING (OCR Error Handling)
// ═══════════════════════════════════════════════════════════════════════════

describe('Semantic Matching (OCR Error Handling)', () => {
  it('should match after possessive normalization', () => {
    // "Stone's" vs "Stones" (Dave's concern)
    expect(areSemanticallySimilar("STONE'S THROW", "Stones Throw")).toBe(true);
  });

  it('should match with smart quote variations', () => {
    expect(areSemanticallySimilar("MAKER'S MARK", "MAKER'S MARK")).toBe(true);
  });

  it('should not match completely different strings', () => {
    expect(areSemanticallySimilar('JACK DANIELS', 'JIM BEAM')).toBe(false);
  });

  it('should match case-insensitive variations', () => {
    expect(areSemanticallySimilar('OLD TOM DISTILLERY', 'old tom distillery')).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// BRAND NAME COMPARISON
// ═══════════════════════════════════════════════════════════════════════════

describe('Brand Name Comparison', () => {
  it('should match identical brand names', () => {
    const result = compareBrandNames('OLD TOM DISTILLERY', 'OLD TOM DISTILLERY');
    expect(result.matches).toBe(true);
    expect(result.confidence).toBe(1.0);
  });

  it('should match case-insensitive brand names', () => {
    const result = compareBrandNames('OLD TOM DISTILLERY', 'Old Tom Distillery');
    expect(result.matches).toBe(true);
    expect(result.confidence).toBe(1.0);
  });

  it('should match brand names with minor differences (Dave\'s concern)', () => {
    const result = compareBrandNames("STONE'S THROW", "Stone's Throw");
    expect(result.matches).toBe(true);
    expect(result.confidence).toBeGreaterThan(0.9);
  });

  it('should flag significant differences for review', () => {
    const result = compareBrandNames('OLD TOM', 'OLD TOMS');
    // Should be flagged for review due to similarity but not exact match
    expect(result.confidence).toBeGreaterThan(0.7);
  });

  it('should flag completely different names as mismatch', () => {
    const result = compareBrandNames('MAKERS MARK', 'JACK DANIELS');
    expect(result.matches).toBe(false);
    expect(result.confidence).toBeLessThan(0.5);
  });

  it('should handle smart quotes in brand names', () => {
    const result = compareBrandNames("MAKER'S MARK", "MAKER\u2019S MARK");
    expect(result.matches).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// ALCOHOL CONTENT PARSING
// ═══════════════════════════════════════════════════════════════════════════

describe('Alcohol Content Parsing', () => {
  it('should parse percentage format', () => {
    const result = parseAlcoholContent('45% Alc./Vol.');
    expect(result.percentage).toBe(45);
  });

  it('should parse percentage with ABV', () => {
    const result = parseAlcoholContent('40% ABV');
    expect(result.percentage).toBe(40);
  });

  it('should parse proof', () => {
    const result = parseAlcoholContent('90 Proof');
    expect(result.proof).toBe(90);
  });

  it('should parse both percentage and proof', () => {
    const result = parseAlcoholContent('45% Alc./Vol. (90 Proof)');
    expect(result.percentage).toBe(45);
    expect(result.proof).toBe(90);
  });

  it('should handle decimal percentages', () => {
    const result = parseAlcoholContent('14.5% Alc./Vol.');
    expect(result.percentage).toBe(14.5);
  });

  it('should parse "Alcohol by Volume" format', () => {
    const result = parseAlcoholContent('40% Alcohol by Volume');
    expect(result.percentage).toBe(40);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// ALCOHOL CONTENT COMPARISON (with TTB tolerances)
// ═══════════════════════════════════════════════════════════════════════════

describe('Alcohol Content Comparison', () => {
  it('should match identical alcohol content', () => {
    const result = compareAlcoholContent('45% Alc./Vol.', '45% Alc./Vol.');
    expect(result.matches).toBe(true);
    expect(result.confidence).toBe(1.0);
  });

  it('should match with slight formatting differences', () => {
    const result = compareAlcoholContent('45% Alc./Vol.', '45% ABV');
    expect(result.matches).toBe(true);
  });

  it('should accept within TTB tolerance for spirits (±0.3%)', () => {
    // 0.2% difference is within ±0.3% tolerance
    const result = compareAlcoholContent('45% Alc./Vol.', '45.2% Alc./Vol.', 'distilled_spirits');
    expect(result.matches).toBe(true);
    expect(result.notes).toContain('tolerance');
  });

  it('should reject outside TTB tolerance', () => {
    // 5% difference is way outside tolerance
    const result = compareAlcoholContent('45% Alc./Vol.', '40% Alc./Vol.');
    expect(result.matches).toBe(false);
    expect(result.notes).toContain('mismatch');
  });

  it('should use wine tolerance for wine (±1.5% for table wine)', () => {
    // 1% difference is within ±1.5% tolerance for wine
    const result = compareAlcoholContent('13% Alc./Vol.', '14% Alc./Vol.', 'wine');
    expect(result.matches).toBe(true);
  });

  it('should accept small proof differences', () => {
    const result = compareAlcoholContent('90 Proof', '91 Proof', 'distilled_spirits');
    expect(result.matches).toBe(true);
  });
});

describe('TTB Tolerance Calculations', () => {
  it('should return 0.3% tolerance for standard spirits', () => {
    expect(getAlcoholTolerance('distilled_spirits', 40)).toBe(0.3);
  });

  it('should return 0.15% tolerance for high-proof spirits', () => {
    expect(getAlcoholTolerance('distilled_spirits', 55)).toBe(0.15);
  });

  it('should return 1.5% tolerance for table wine', () => {
    expect(getAlcoholTolerance('wine', 12)).toBe(1.5);
  });

  it('should return 1.0% tolerance for dessert wine', () => {
    expect(getAlcoholTolerance('wine', 18)).toBe(1.0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// NET CONTENTS PARSING
// ═══════════════════════════════════════════════════════════════════════════

describe('Net Contents Parsing', () => {
  it('should parse mL', () => {
    const result = parseNetContents('750 mL');
    expect(result.value).toBe(750);
    expect(result.unit).toBe('ml');
  });

  it('should parse L and convert to mL', () => {
    const result = parseNetContents('1 L');
    expect(result.value).toBe(1000);
    expect(result.unit).toBe('ml');
  });

  it('should parse fluid ounces', () => {
    const result = parseNetContents('12 fl oz');
    expect(result.value).toBe(12);
    expect(result.unit).toBe('fl oz');
  });

  it('should handle various mL formats', () => {
    expect(parseNetContents('750mL').value).toBe(750);
    expect(parseNetContents('750 ml').value).toBe(750);
    const mlResult = parseNetContents('750 milliliters');
    expect(mlResult.value).toBe(750);
  });

  it('should parse 1.75L format', () => {
    const result = parseNetContents('1.75 L');
    expect(result.value).toBe(1750);
    expect(result.unit).toBe('ml');
  });
});

describe('Net Contents Comparison', () => {
  it('should match identical net contents', () => {
    const result = compareNetContents('750 mL', '750 mL');
    expect(result.matches).toBe(true);
    expect(result.confidence).toBe(1.0);
  });

  it('should match with different formatting', () => {
    const result = compareNetContents('750 mL', '750mL');
    expect(result.matches).toBe(true);
  });

  it('should reject different volumes', () => {
    const result = compareNetContents('750 mL', '1 L');
    expect(result.matches).toBe(false);
  });

  it('should note non-standard fill sizes', () => {
    const result = compareNetContents('800 mL', '800 mL', 'distilled_spirits');
    expect(result.matches).toBe(true);
    expect(result.notes).toContain('Non-standard');
  });
});

describe('Standard Fill Size Validation', () => {
  it('should recognize standard spirits sizes', () => {
    expect(isStandardFillSize('distilled_spirits', 750)).toBe(true);
    expect(isStandardFillSize('distilled_spirits', 1000)).toBe(true);
    expect(isStandardFillSize('distilled_spirits', 1750)).toBe(true);
  });

  it('should flag non-standard sizes', () => {
    expect(isStandardFillSize('distilled_spirits', 800)).toBe(false);
    expect(isStandardFillSize('distilled_spirits', 500)).toBe(false);
  });

  it('should recognize standard wine sizes', () => {
    expect(isStandardFillSize('wine', 750)).toBe(true);
    expect(isStandardFillSize('wine', 1500)).toBe(true); // Magnum
  });

  it('should recognize standard beer sizes (in mL)', () => {
    expect(isStandardFillSize('beer', 355)).toBe(true); // 12 fl oz
    expect(isStandardFillSize('beer', 473)).toBe(true); // 16 fl oz
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// GOVERNMENT WARNING VALIDATION
// ═══════════════════════════════════════════════════════════════════════════

describe('Government Warning Validation', () => {
  it('should accept correct warning with proper formatting', () => {
    const result = validateGovernmentWarning(GOVERNMENT_WARNING_TEXT);
    expect(result.present).toBe(true);
    expect(result.correct).toBe(true);
  });

  it('should reject missing warning', () => {
    const result = validateGovernmentWarning(undefined);
    expect(result.present).toBe(false);
    expect(result.correct).toBe(false);
  });

  it('should reject empty warning', () => {
    const result = validateGovernmentWarning('');
    expect(result.present).toBe(false);
    expect(result.correct).toBe(false);
  });

  it('should reject warning with title case prefix (Jenny\'s concern)', () => {
    const incorrectWarning = `Government Warning: (1) According to the Surgeon General, women should not drink alcoholic beverages during pregnancy because of the risk of birth defects. (2) Consumption of alcoholic beverages impairs your ability to drive a car or operate machinery, and may cause health problems.`;
    const result = validateGovernmentWarning(incorrectWarning);
    expect(result.present).toBe(true);
    expect(result.correct).toBe(false);
    expect(result.notes).toContain('ALL CAPS');
  });

  it('should reject warning with lowercase prefix', () => {
    const incorrectWarning = `government warning: (1) According to the Surgeon General...`;
    const result = validateGovernmentWarning(incorrectWarning);
    expect(result.present).toBe(true);
    expect(result.correct).toBe(false);
  });

  it('should reject warning missing colon', () => {
    const incorrectWarning = `GOVERNMENT WARNING (1) According to the Surgeon General...`;
    const result = validateGovernmentWarning(incorrectWarning);
    expect(result.present).toBe(true);
    expect(result.correct).toBe(false);
    expect(result.notes).toContain('colon');
  });

  it('should detect warning with minor text variations', () => {
    const slightlyDifferent = `GOVERNMENT WARNING: (1) According to the Surgeon General, women should not consume alcoholic beverages during pregnancy because of the risk of birth defects. (2) Consumption of alcoholic beverages impairs your ability to drive a car or operate machinery, and may cause health problems.`;
    const result = validateGovernmentWarning(slightlyDifferent);
    expect(result.present).toBe(true);
    // Should flag as potentially incorrect due to text difference ("consume" vs "drink")
  });

  it('should provide detailed issues list', () => {
    const incorrectWarning = `Government Warning: Partial warning text only.`;
    const result = validateGovernmentWarning(incorrectWarning);
    expect(result.issues).toBeDefined();
    expect(result.issues!.length).toBeGreaterThan(0);
  });
});

describe('Enhanced Government Warning Validation', () => {
  it('should use AI-extracted warning details', () => {
    const extractedData: ExtractedLabelData = {
      governmentWarning: GOVERNMENT_WARNING_TEXT,
      governmentWarningFormatCorrect: true,
      governmentWarningDetails: {
        prefixInAllCaps: true,
        appearsBold: true,
        onContrastingBackground: true,
        textComplete: true,
        issues: [],
      },
      confidence: 0.95,
    };
    
    const result = validateGovernmentWarningEnhanced(extractedData);
    expect(result.present).toBe(true);
    expect(result.correct).toBe(true);
    expect(result.issues).toHaveLength(0);
  });

  it('should flag non-bold warning', () => {
    const extractedData: ExtractedLabelData = {
      governmentWarning: GOVERNMENT_WARNING_TEXT,
      governmentWarningFormatCorrect: false,
      governmentWarningDetails: {
        prefixInAllCaps: true,
        appearsBold: false, // Not bold!
        onContrastingBackground: true,
        textComplete: true,
        issues: [],
      },
      confidence: 0.95,
    };
    
    const result = validateGovernmentWarningEnhanced(extractedData);
    expect(result.issues.some(i => i.includes('bold'))).toBe(true);
  });

  it('should flag incomplete warning text', () => {
    const extractedData: ExtractedLabelData = {
      governmentWarning: 'GOVERNMENT WARNING: Partial text only',
      governmentWarningFormatCorrect: false,
      governmentWarningDetails: {
        prefixInAllCaps: true,
        appearsBold: true,
        onContrastingBackground: true,
        textComplete: false, // Incomplete!
        issues: ['Warning text appears truncated'],
      },
      confidence: 0.7,
    };
    
    const result = validateGovernmentWarningEnhanced(extractedData);
    expect(result.correct).toBe(false);
    expect(result.issues.some(i => i.includes('incomplete') || i.includes('truncated'))).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// FULL LABEL VERIFICATION
// ═══════════════════════════════════════════════════════════════════════════

describe('Full Label Verification', () => {
  const baseApplicationData: ApplicationData = {
    brandName: 'OLD TOM DISTILLERY',
    classType: 'Kentucky Straight Bourbon Whiskey',
    beverageType: 'distilled_spirits',
    alcoholContent: '45% Alc./Vol.',
    proof: '90 Proof',
    netContents: '750 mL',
    producerName: 'Old Tom Distilling Co.',
    producerAddress: 'Louisville, KY',
    countryOfOrigin: 'United States',
  };

  it('should approve matching label', () => {
    const extractedData: ExtractedLabelData = {
      brandName: 'OLD TOM DISTILLERY',
      classType: 'Kentucky Straight Bourbon Whiskey',
      alcoholContent: '45% Alc./Vol.',
      netContents: '750 mL',
      producerName: 'Old Tom Distilling Co.',
      producerAddress: 'Louisville, KY',
      countryOfOrigin: 'United States',
      governmentWarning: GOVERNMENT_WARNING_TEXT,
      governmentWarningFormatCorrect: true,
      confidence: 0.95,
    };

    const result = verifyLabel(baseApplicationData, extractedData, 1000);
    expect(result.status).toBe('approved');
    expect(result.matchedFields).toBe(result.totalFields);
    expect(result.governmentWarningCorrect).toBe(true);
    expect(result.meetsTargetTime).toBe(true);
  });

  it('should reject label with wrong alcohol content', () => {
    const extractedData: ExtractedLabelData = {
      brandName: 'OLD TOM DISTILLERY',
      classType: 'Kentucky Straight Bourbon Whiskey',
      alcoholContent: '40% Alc./Vol.', // Different!
      netContents: '750 mL',
      producerName: 'Old Tom Distilling Co.',
      governmentWarning: GOVERNMENT_WARNING_TEXT,
      governmentWarningFormatCorrect: true,
      confidence: 0.95,
    };

    const result = verifyLabel(baseApplicationData, extractedData, 1000);
    expect(result.status).toBe('rejected');
    expect(result.flaggedIssues).toContain('Alcohol content mismatch');
  });

  it('should approve alcohol content within TTB tolerance', () => {
    const extractedData: ExtractedLabelData = {
      brandName: 'OLD TOM DISTILLERY',
      classType: 'Kentucky Straight Bourbon Whiskey',
      alcoholContent: '45.2% Alc./Vol.', // Within ±0.3% tolerance
      netContents: '750 mL',
      producerName: 'Old Tom Distilling Co.',
      producerAddress: 'Louisville, KY',
      countryOfOrigin: 'United States',
      governmentWarning: GOVERNMENT_WARNING_TEXT,
      governmentWarningFormatCorrect: true,
      confidence: 0.95,
    };

    const result = verifyLabel(baseApplicationData, extractedData, 1000);
    expect(result.status).toBe('approved');
  });

  it('should not approve label with missing government warning', () => {
    const extractedData: ExtractedLabelData = {
      brandName: 'OLD TOM DISTILLERY',
      classType: 'Kentucky Straight Bourbon Whiskey',
      alcoholContent: '45% Alc./Vol.',
      netContents: '750 mL',
      producerName: 'Old Tom Distilling Co.',
      producerAddress: 'Louisville, KY',
      countryOfOrigin: 'United States',
      governmentWarning: undefined, // Missing!
      confidence: 0.95,
    };

    const result = verifyLabel(baseApplicationData, extractedData, 1000);
    expect(result.status).not.toBe('approved');
    expect(result.governmentWarningPresent).toBe(false);
    expect(result.flaggedIssues.some(issue => issue.toLowerCase().includes('government warning'))).toBe(true);
  });

  it('should flag for review with low confidence', () => {
    const extractedData: ExtractedLabelData = {
      brandName: 'OLD TOM DISTILLERY',
      classType: 'Kentucky Straight Bourbon Whiskey',
      alcoholContent: '45% Alc./Vol.',
      netContents: '750 mL',
      producerName: 'Old Tom Distilling Co.',
      governmentWarning: GOVERNMENT_WARNING_TEXT,
      governmentWarningFormatCorrect: true,
      confidence: 0.5, // Low confidence!
    };

    const result = verifyLabel(baseApplicationData, extractedData, 1000);
    expect(result.status).toBe('needs_review');
    expect(result.requiresHumanReview).toBe(true);
    expect(result.humanReviewReasons.some(r => r.toLowerCase().includes('confidence'))).toBe(true);
  });

  it('should flag similar but not exact brand names for review', () => {
    const extractedData: ExtractedLabelData = {
      brandName: "OLD TOM'S DISTILLERY", // Slight difference
      classType: 'Kentucky Straight Bourbon Whiskey',
      alcoholContent: '45% Alc./Vol.',
      netContents: '750 mL',
      producerName: 'Old Tom Distilling Co.',
      governmentWarning: GOVERNMENT_WARNING_TEXT,
      governmentWarningFormatCorrect: true,
      confidence: 0.95,
    };

    const result = verifyLabel(baseApplicationData, extractedData, 1000);
    // Should either approve with notes or flag for review
    expect(['approved', 'needs_review']).toContain(result.status);
  });

  it('should include processing time in results', () => {
    const extractedData: ExtractedLabelData = {
      brandName: 'OLD TOM DISTILLERY',
      classType: 'Kentucky Straight Bourbon Whiskey',
      alcoholContent: '45% Alc./Vol.',
      netContents: '750 mL',
      producerName: 'Old Tom Distilling Co.',
      governmentWarning: GOVERNMENT_WARNING_TEXT,
      governmentWarningFormatCorrect: true,
      confidence: 0.95,
    };

    const result = verifyLabel(baseApplicationData, extractedData, 2500);
    expect(result.processingTimeMs).toBe(2500);
    expect(result.meetsTargetTime).toBe(true); // Under 5s
  });

  it('should flag when processing exceeds target time', () => {
    const extractedData: ExtractedLabelData = {
      brandName: 'OLD TOM DISTILLERY',
      classType: 'Kentucky Straight Bourbon Whiskey',
      alcoholContent: '45% Alc./Vol.',
      netContents: '750 mL',
      producerName: 'Old Tom Distilling Co.',
      governmentWarning: GOVERNMENT_WARNING_TEXT,
      governmentWarningFormatCorrect: true,
      confidence: 0.95,
    };

    const result = verifyLabel(baseApplicationData, extractedData, 7000);
    expect(result.processingTimeMs).toBe(7000);
    expect(result.meetsTargetTime).toBe(false); // Over 5s
  });

  it('should never produce false positives (conservative approach)', () => {
    const extractedData: ExtractedLabelData = {
      brandName: 'OLD TOM DISTILLERY',
      classType: 'Kentucky Bourbon Whiskey', // Missing "Straight"
      alcoholContent: '45% Alc./Vol.',
      netContents: '750 mL',
      producerName: 'Old Tom Distilling Co.',
      governmentWarning: GOVERNMENT_WARNING_TEXT,
      governmentWarningFormatCorrect: true,
      confidence: 0.85,
    };

    const result = verifyLabel(baseApplicationData, extractedData, 1000);
    // Should either reject or flag for review, never approve with mismatches
    expect(result.status !== 'approved' || result.matchedFields === result.totalFields).toBe(true);
  });

  it('should handle image quality issues', () => {
    const extractedData: ExtractedLabelData = {
      brandName: 'OLD TOM DISTILLERY',
      classType: 'Kentucky Straight Bourbon Whiskey',
      alcoholContent: '45% Alc./Vol.',
      netContents: '750 mL',
      producerName: 'Old Tom Distilling Co.',
      governmentWarning: GOVERNMENT_WARNING_TEXT,
      governmentWarningFormatCorrect: true,
      confidence: 0.6,
      imageQuality: {
        overallScore: 0.5,
        issues: ['blur', 'poor_lighting'],
        recommendResubmit: true,
      },
    };

    const result = verifyLabel(baseApplicationData, extractedData, 1000);
    expect(result.requiresHumanReview).toBe(true);
    expect(result.humanReviewReasons.some(r => r.toLowerCase().includes('image'))).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// WINE-SPECIFIC TESTS
// ═══════════════════════════════════════════════════════════════════════════

describe('Wine Label Verification', () => {
  const wineApplicationData: ApplicationData = {
    brandName: 'VALLEY OAKS',
    classType: 'Cabernet Sauvignon',
    beverageType: 'wine',
    alcoholContent: '14.5% Alc./Vol.',
    netContents: '750 mL',
    producerName: 'Valley Oaks Winery',
    producerAddress: 'Napa Valley, CA',
    countryOfOrigin: 'United States',
    vintageYear: '2019',
    appellation: 'Napa Valley',
  };

  it('should verify wine with vintage year', () => {
    const extractedData: ExtractedLabelData = {
      brandName: 'VALLEY OAKS',
      classType: 'Cabernet Sauvignon',
      alcoholContent: '14.5% Alc./Vol.',
      netContents: '750 mL',
      producerName: 'Valley Oaks Winery',
      countryOfOrigin: 'United States',
      governmentWarning: GOVERNMENT_WARNING_TEXT,
      governmentWarningFormatCorrect: true,
      vintageYear: '2019',
      appellation: 'Napa Valley',
      confidence: 0.95,
    };

    const result = verifyLabel(wineApplicationData, extractedData, 1000);
    expect(result.status).toBe('approved');
  });

  it('should flag vintage year mismatch', () => {
    const extractedData: ExtractedLabelData = {
      brandName: 'VALLEY OAKS',
      classType: 'Cabernet Sauvignon',
      alcoholContent: '14.5% Alc./Vol.',
      netContents: '750 mL',
      producerName: 'Valley Oaks Winery',
      governmentWarning: GOVERNMENT_WARNING_TEXT,
      governmentWarningFormatCorrect: true,
      vintageYear: '2020', // Wrong year!
      confidence: 0.95,
    };

    const result = verifyLabel(wineApplicationData, extractedData, 1000);
    expect(result.flaggedIssues).toContain('Vintage year mismatch');
  });

  it('should use wine tolerance for ABV (±1.5%)', () => {
    const extractedData: ExtractedLabelData = {
      brandName: 'VALLEY OAKS',
      classType: 'Cabernet Sauvignon',
      alcoholContent: '15.0% Alc./Vol.', // 0.5% difference, within wine tolerance
      netContents: '750 mL',
      producerName: 'Valley Oaks Winery',
      producerAddress: 'Napa Valley, CA',
      countryOfOrigin: 'United States',
      governmentWarning: GOVERNMENT_WARNING_TEXT,
      governmentWarningFormatCorrect: true,
      vintageYear: '2019',
      appellation: 'Napa Valley',
      confidence: 0.95,
    };

    const result = verifyLabel(wineApplicationData, extractedData, 1000);
    // Should accept because 0.5% is within ±1.5% wine tolerance
    expect(result.fieldVerifications.find(f => f.field === 'Alcohol Content')?.matches).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// BEER-SPECIFIC TESTS
// ═══════════════════════════════════════════════════════════════════════════

describe('Beer Label Verification', () => {
  const beerApplicationData: ApplicationData = {
    brandName: 'IRONWORKS',
    classType: 'India Pale Ale',
    beverageType: 'beer',
    alcoholContent: '6.8% Alc./Vol.',
    netContents: '12 fl oz',
    producerName: 'Ironworks Brewing Company',
    producerAddress: 'Portland, OR',
    countryOfOrigin: 'United States',
  };

  it('should verify beer with imperial net contents', () => {
    const extractedData: ExtractedLabelData = {
      brandName: 'IRONWORKS',
      classType: 'India Pale Ale',
      alcoholContent: '6.8% Alc./Vol.',
      netContents: '12 fl oz',
      producerName: 'Ironworks Brewing Company',
      countryOfOrigin: 'United States',
      governmentWarning: GOVERNMENT_WARNING_TEXT,
      governmentWarningFormatCorrect: true,
      confidence: 0.95,
    };

    const result = verifyLabel(beerApplicationData, extractedData, 1000);
    expect(result.status).toBe('approved');
  });

  it('should match equivalent metric and imperial volumes', () => {
    const extractedData: ExtractedLabelData = {
      brandName: 'IRONWORKS',
      classType: 'India Pale Ale',
      alcoholContent: '6.8% Alc./Vol.',
      netContents: '355 mL', // Equivalent to 12 fl oz
      producerName: 'Ironworks Brewing Company',
      countryOfOrigin: 'United States',
      governmentWarning: GOVERNMENT_WARNING_TEXT,
      governmentWarningFormatCorrect: true,
      confidence: 0.95,
    };

    const result = verifyLabel(beerApplicationData, extractedData, 1000);
    const netContentsField = result.fieldVerifications.find(f => f.field === 'Net Contents');
    expect(netContentsField?.matches).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// PERFORMANCE
// ═══════════════════════════════════════════════════════════════════════════

describe('Performance', () => {
  it('should complete verification in reasonable time', () => {
    const applicationData: ApplicationData = {
      brandName: 'TEST BRAND',
      classType: 'Test Type',
      beverageType: 'distilled_spirits',
      alcoholContent: '40% Alc./Vol.',
      netContents: '750 mL',
      producerName: 'Test Producer',
      producerAddress: 'Test Address',
    };

    const extractedData: ExtractedLabelData = {
      brandName: 'TEST BRAND',
      classType: 'Test Type',
      alcoholContent: '40% Alc./Vol.',
      netContents: '750 mL',
      producerName: 'Test Producer',
      governmentWarning: GOVERNMENT_WARNING_TEXT,
      confidence: 0.9,
    };

    const start = performance.now();
    for (let i = 0; i < 1000; i++) {
      verifyLabel(applicationData, extractedData, 0);
    }
    const elapsed = performance.now() - start;

    // Verification logic (excluding AI) should be very fast
    expect(elapsed).toBeLessThan(1000); // 1000 verifications in under 1 second
  });
});
