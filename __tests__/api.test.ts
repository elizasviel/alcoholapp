import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the Gemini module
vi.mock('@/lib/gemini', () => ({
  extractLabelData: vi.fn(),
}));

import { extractLabelData } from '@/lib/gemini';
import { verifyLabel } from '@/lib/verification';
import { ApplicationData, ExtractedLabelData, GOVERNMENT_WARNING_TEXT } from '@/types';

describe('API Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Label Extraction and Verification Flow', () => {
    const mockApplicationData: ApplicationData = {
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

    it('should correctly process a matching label', async () => {
      const mockExtractedData: ExtractedLabelData = {
        brandName: 'OLD TOM DISTILLERY',
        classType: 'Kentucky Straight Bourbon Whiskey',
        alcoholContent: '45% Alc./Vol.',
        proof: '90 Proof',
        netContents: '750 mL',
        producerName: 'Old Tom Distilling Co.',
        producerAddress: 'Louisville, KY',
        countryOfOrigin: 'United States',
        governmentWarning: GOVERNMENT_WARNING_TEXT,
        governmentWarningFormatCorrect: true,
        confidence: 0.95,
      };

      (extractLabelData as ReturnType<typeof vi.fn>).mockResolvedValue(mockExtractedData);

      const result = verifyLabel(mockApplicationData, mockExtractedData, 1500);

      expect(result.status).toBe('approved');
      expect(result.overallConfidence).toBeGreaterThan(0.9);
      expect(result.matchedFields).toBe(result.totalFields);
      expect(result.processingTimeMs).toBe(1500);
    });

    it('should reject a label with mismatched brand name', async () => {
      const mockExtractedData: ExtractedLabelData = {
        brandName: 'DIFFERENT BRAND',
        classType: 'Kentucky Straight Bourbon Whiskey',
        alcoholContent: '45% Alc./Vol.',
        netContents: '750 mL',
        producerName: 'Old Tom Distilling Co.',
        governmentWarning: GOVERNMENT_WARNING_TEXT,
        governmentWarningFormatCorrect: true,
        confidence: 0.95,
      };

      const result = verifyLabel(mockApplicationData, mockExtractedData, 1500);

      expect(result.status).not.toBe('approved');
      expect(result.flaggedIssues.length).toBeGreaterThan(0);
    });

    it('should flag label with incorrect government warning format', async () => {
      const incorrectWarning = 'Government Warning: This is the wrong format.';
      
      const mockExtractedData: ExtractedLabelData = {
        brandName: 'OLD TOM DISTILLERY',
        classType: 'Kentucky Straight Bourbon Whiskey',
        alcoholContent: '45% Alc./Vol.',
        netContents: '750 mL',
        producerName: 'Old Tom Distilling Co.',
        producerAddress: 'Louisville, KY',
        countryOfOrigin: 'United States',
        governmentWarning: incorrectWarning,
        governmentWarningFormatCorrect: false,
        confidence: 0.95,
      };

      const result = verifyLabel(mockApplicationData, mockExtractedData, 1500);

      expect(result.governmentWarningCorrect).toBe(false);
      expect(result.status).not.toBe('approved');
    });

    it('should handle wine labels correctly', async () => {
      const wineApplicationData: ApplicationData = {
        brandName: 'VALLEY OAKS',
        classType: 'Cabernet Sauvignon',
        beverageType: 'wine',
        alcoholContent: '14.5% Alc./Vol.',
        netContents: '750 mL',
        producerName: 'Valley Oaks Winery',
        producerAddress: 'Napa Valley, CA',
        vintageYear: '2019',
        appellation: 'Napa Valley',
      };

      const mockExtractedData: ExtractedLabelData = {
        brandName: 'VALLEY OAKS',
        classType: 'Cabernet Sauvignon',
        alcoholContent: '14.5% Alc./Vol.',
        netContents: '750 mL',
        producerName: 'Valley Oaks Winery',
        producerAddress: 'Napa Valley, CA',
        vintageYear: '2019',
        appellation: 'Napa Valley',
        governmentWarning: GOVERNMENT_WARNING_TEXT,
        governmentWarningFormatCorrect: true,
        confidence: 0.92,
      };

      const result = verifyLabel(wineApplicationData, mockExtractedData, 2000);

      expect(result.status).toBe('approved');
    });

    it('should handle beer labels correctly', async () => {
      const beerApplicationData: ApplicationData = {
        brandName: 'IRONWORKS',
        classType: 'India Pale Ale',
        beverageType: 'beer',
        alcoholContent: '6.8% Alc./Vol.',
        netContents: '12 fl oz',
        producerName: 'Ironworks Brewing Company',
        producerAddress: 'Portland, OR',
      };

      const mockExtractedData: ExtractedLabelData = {
        brandName: 'IRONWORKS',
        classType: 'India Pale Ale',
        alcoholContent: '6.8% Alc./Vol.',
        netContents: '12 fl oz',
        producerName: 'Ironworks Brewing Company',
        producerAddress: 'Portland, OR',
        governmentWarning: GOVERNMENT_WARNING_TEXT,
        governmentWarningFormatCorrect: true,
        confidence: 0.88,
      };

      const result = verifyLabel(beerApplicationData, mockExtractedData, 1800);

      expect(result.status).toBe('approved');
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing optional fields gracefully', async () => {
      const minimalApplicationData: ApplicationData = {
        brandName: 'TEST BRAND',
        classType: 'Vodka',
        beverageType: 'distilled_spirits',
        alcoholContent: '40% Alc./Vol.',
        netContents: '750 mL',
        producerName: 'Test Producer',
        producerAddress: 'Test City, ST',
      };

      const mockExtractedData: ExtractedLabelData = {
        brandName: 'TEST BRAND',
        classType: 'Vodka',
        alcoholContent: '40% Alc./Vol.',
        netContents: '750 mL',
        producerName: 'Test Producer',
        producerAddress: 'Test City, ST',
        governmentWarning: GOVERNMENT_WARNING_TEXT,
        governmentWarningFormatCorrect: true,
        confidence: 0.9,
      };

      const result = verifyLabel(minimalApplicationData, mockExtractedData, 1000);

      expect(result.status).toBe('approved');
    });

    it('should handle partial extraction gracefully', async () => {
      const applicationData: ApplicationData = {
        brandName: 'TEST BRAND',
        classType: 'Vodka',
        beverageType: 'distilled_spirits',
        alcoholContent: '40% Alc./Vol.',
        netContents: '750 mL',
        producerName: 'Test Producer',
        producerAddress: 'Test City, ST',
      };

      // Simulating poor image quality - some fields not extracted
      const mockExtractedData: ExtractedLabelData = {
        brandName: 'TEST BRAND',
        classType: undefined, // Could not read
        alcoholContent: '40% Alc./Vol.',
        netContents: undefined, // Could not read
        producerName: 'Test Producer',
        governmentWarning: GOVERNMENT_WARNING_TEXT,
        governmentWarningFormatCorrect: true,
        confidence: 0.6, // Low confidence due to poor extraction
      };

      const result = verifyLabel(applicationData, mockExtractedData, 3000);

      expect(result.status).not.toBe('approved');
      expect(result.requiresHumanReview).toBe(true);
    });
  });

  describe('Performance Requirements', () => {
    it('should complete verification within acceptable time', async () => {
      const applicationData: ApplicationData = {
        brandName: 'PERFORMANCE TEST',
        classType: 'Test Spirit',
        beverageType: 'distilled_spirits',
        alcoholContent: '40% Alc./Vol.',
        netContents: '750 mL',
        producerName: 'Test Producer',
        producerAddress: 'Test City, ST',
      };

      const mockExtractedData: ExtractedLabelData = {
        brandName: 'PERFORMANCE TEST',
        classType: 'Test Spirit',
        alcoholContent: '40% Alc./Vol.',
        netContents: '750 mL',
        producerName: 'Test Producer',
        producerAddress: 'Test City, ST',
        governmentWarning: GOVERNMENT_WARNING_TEXT,
        governmentWarningFormatCorrect: true,
        confidence: 0.95,
      };

      const start = performance.now();
      
      // Run 100 verifications
      for (let i = 0; i < 100; i++) {
        verifyLabel(applicationData, mockExtractedData, 0);
      }
      
      const elapsed = performance.now() - start;

      // 100 verifications should complete in under 100ms
      expect(elapsed).toBeLessThan(100);
    });
  });
});

describe('Batch Processing', () => {
  it('should handle batch of labels', async () => {
    const labels = Array.from({ length: 10 }, (_, i) => ({
      applicationData: {
        brandName: `BRAND ${i}`,
        classType: 'Test Type',
        beverageType: 'distilled_spirits' as const,
        alcoholContent: '40% Alc./Vol.',
        netContents: '750 mL',
        producerName: 'Test Producer',
        producerAddress: 'Test City, ST',
      },
      extractedData: {
        brandName: `BRAND ${i}`,
        classType: 'Test Type',
        alcoholContent: '40% Alc./Vol.',
        netContents: '750 mL',
        producerName: 'Test Producer',
        producerAddress: 'Test City, ST',
        governmentWarning: GOVERNMENT_WARNING_TEXT,
        governmentWarningFormatCorrect: true,
        confidence: 0.9,
      } as ExtractedLabelData,
    }));

    const results = labels.map((label, i) => 
      verifyLabel(label.applicationData, label.extractedData, 100 * i)
    );

    expect(results).toHaveLength(10);
    expect(results.every(r => r.status === 'approved')).toBe(true);
  });
});

