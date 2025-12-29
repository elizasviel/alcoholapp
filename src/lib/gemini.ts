import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import { ExtractedLabelData, BeverageType, ImageQualityIssue, GovernmentWarningDetails } from '@/types';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

// Use Gemini 2.5 Flash-Lite - Google's "ULTRA FAST" model for high throughput
const model = genAI.getGenerativeModel({
  model: 'gemini-2.5-flash-lite',
  generationConfig: {
    temperature: 0.1, // Low temperature for consistent extraction
    topP: 0.8,
    topK: 20,
    maxOutputTokens: 4096, // Increased to avoid truncation of long gov warnings
    responseMimeType: 'application/json', // Force JSON output
    // @ts-expect-error - thinkingConfig for disabling thinking overhead
    thinkingConfig: { thinkingBudget: 0 },
  },
  safetySettings: [
    {
      category: HarmCategory.HARM_CATEGORY_HARASSMENT,
      threshold: HarmBlockThreshold.BLOCK_NONE,
    },
    {
      category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
      threshold: HarmBlockThreshold.BLOCK_NONE,
    },
    {
      category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
      threshold: HarmBlockThreshold.BLOCK_NONE,
    },
    {
      category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
      threshold: HarmBlockThreshold.BLOCK_NONE,
    },
  ],
});

/**
 * Optimized TTB Label Extraction Prompt
 * 
 * Streamlined for speed (<5s target) while maintaining accuracy.
 * Key checks: Government warning ALL CAPS, exact field extraction, confidence scoring.
 */
const LABEL_EXTRACTION_PROMPT = `Extract alcohol label data for TTB compliance. Be precise and fast.

EXTRACT THESE FIELDS (use null if not found):
1. brandName - Primary brand name exactly as shown
2. fancifulName - Sub-brand/tagline if present
3. classType - Beverage type (e.g., "Kentucky Straight Bourbon Whiskey", "Cabernet Sauvignon")
4. alcoholContent - ABV exactly as shown (e.g., "45% Alc./Vol.")
5. proof - Proof statement if shown (e.g., "90 Proof")
6. netContents - Volume (e.g., "750 mL", "12 fl oz")
7. producerName - Bottler/distiller/importer name
8. producerAddress - City, State/Country
9. countryOfOrigin - For imports
10. governmentWarning - FULL health warning text exactly as shown
11. vintageYear - For wine (YYYY)
12. appellation - Wine region
13. containsSulfites - true/false/null
14. ageStatement - Age if stated

CRITICAL: Check if "GOVERNMENT WARNING:" is in ALL CAPS (required by law).

RESPOND WITH JSON ONLY:
{
  "brandName": "string or null",
  "fancifulName": "string or null",
  "classType": "string or null",
  "alcoholContent": "string or null",
  "proof": "string or null",
  "netContents": "string or null",
  "producerName": "string or null",
  "producerAddress": "string or null",
  "countryOfOrigin": "string or null",
  "governmentWarning": "FULL text or null",
  "governmentWarningDetails": {
    "prefixInAllCaps": true/false,
    "textComplete": true/false,
    "issues": []
  },
  "vintageYear": "string or null",
  "appellation": "string or null",
  "containsSulfites": true/false/null,
  "ageStatement": "string or null",
  "rawText": "all visible text",
  "confidence": 0.0-1.0,
  "imageQuality": {
    "overallScore": 0.0-1.0,
    "issues": [],
    "recommendResubmit": false
  }
}`;

/**
 * Extract label data from an image using Gemini Vision
 */
export async function extractLabelData(
  imageBase64: string,
  mimeType: string = 'image/jpeg'
): Promise<ExtractedLabelData> {
  const startTime = Date.now();

  try {
    const result = await model.generateContent([
      { text: LABEL_EXTRACTION_PROMPT },
      {
        inlineData: {
          mimeType: mimeType,
          data: imageBase64,
        },
      },
    ]);

    const response = result.response;
    const content = response.text();

    if (!content) {
      throw new Error('No response from Gemini');
    }

    // Parse JSON response - handle various formats
    const parsed = parseGeminiResponse(content);

    const processingTime = Date.now() - startTime;
    console.log(`Label extraction completed in ${processingTime}ms (Gemini 2.5 Flash-Lite)`);

    // Transform parsed response to ExtractedLabelData
    return transformToExtractedData(parsed);
  } catch (error) {
    console.error('Error extracting label data:', error);
    throw error;
  }
}

/**
 * Parse Gemini response, handling various output formats
 */
function parseGeminiResponse(content: string): Record<string, unknown> {
    try {
      // First try direct JSON parse (when responseMimeType is set)
    return JSON.parse(content);
  } catch {
    console.error('Direct JSON parse failed, attempting fallback extraction');
      console.error('Content length:', content.length);
      console.error('Content preview:', content.substring(0, 500));
      
      // Fallback: extract JSON from markdown code blocks or raw text
      let jsonString = content;
      
      // Try to extract from markdown code block first
      const codeBlockMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (codeBlockMatch) {
        jsonString = codeBlockMatch[1];
      } else {
        // Try to extract raw JSON object
        const jsonObjectMatch = content.match(/\{[\s\S]*\}/);
        if (jsonObjectMatch) {
          jsonString = jsonObjectMatch[0];
        }
      }
      
      try {
      return JSON.parse(jsonString);
      } catch (fallbackError) {
        console.error('Fallback JSON parse also failed:', fallbackError);
        throw new Error('Could not parse JSON from response');
    }
  }
}

/**
 * Transform parsed Gemini response to ExtractedLabelData type
 */
function transformToExtractedData(parsed: Record<string, unknown>): ExtractedLabelData {
  // Helper to clean null-like values
  const cleanValue = (val: unknown): string | undefined => {
    if (val === null || val === undefined) return undefined;
    if (typeof val === 'string') {
      const cleaned = val.trim();
      if (cleaned === '' || cleaned === 'NOT_FOUND' || cleaned === 'NOT_READABLE' || cleaned === 'null') {
        return undefined;
      }
      return cleaned;
    }
    return String(val);
  };

  // Parse government warning details (handle both full and simplified formats)
  let governmentWarningDetails: GovernmentWarningDetails | undefined;
  const gwDetails = parsed.governmentWarningDetails as Record<string, unknown> | undefined;
  if (gwDetails) {
    governmentWarningDetails = {
      prefixInAllCaps: gwDetails.prefixInAllCaps as boolean ?? false,
      appearsBold: (gwDetails.appearsBold as boolean | null) ?? null,
      onContrastingBackground: (gwDetails.onContrastingBackground as boolean | null) ?? null,
      textComplete: gwDetails.textComplete as boolean ?? true,
      issues: (gwDetails.issues as string[]) ?? [],
    };
  }

  // Parse image quality (handle both full and simplified formats)
  const imgQuality = parsed.imageQuality as Record<string, unknown> | undefined;
  const imageQuality = imgQuality ? {
    overallScore: (imgQuality.overallScore as number) ?? 0.8,
    issues: (imgQuality.issues as ImageQualityIssue[]) ?? [],
    recommendResubmit: (imgQuality.recommendResubmit as boolean) ?? false,
    details: cleanValue(imgQuality.details),
  } : undefined;

  // Parse field confidences (optional in simplified format)
  const fieldConf = parsed.fieldConfidences as Record<string, number> | undefined;

  return {
    brandName: cleanValue(parsed.brandName),
    fancifulName: cleanValue(parsed.fancifulName),
    classType: cleanValue(parsed.classType),
    alcoholContent: cleanValue(parsed.alcoholContent),
    proof: cleanValue(parsed.proof),
    netContents: cleanValue(parsed.netContents),
    producerName: cleanValue(parsed.producerName),
    producerAddress: cleanValue(parsed.producerAddress),
    producerRole: parsed.producerRole as ExtractedLabelData['producerRole'] ?? undefined,
    countryOfOrigin: cleanValue(parsed.countryOfOrigin),
    governmentWarning: cleanValue(parsed.governmentWarning),
    governmentWarningFormatCorrect: governmentWarningDetails?.prefixInAllCaps && governmentWarningDetails?.textComplete,
    governmentWarningDetails,
    vintageYear: cleanValue(parsed.vintageYear),
    appellation: cleanValue(parsed.appellation),
    containsSulfites: parsed.containsSulfites as boolean | undefined,
    ageStatement: cleanValue(parsed.ageStatement),
    rawText: cleanValue(parsed.rawText),
    confidence: (parsed.confidence as number) ?? 0.8,
    fieldConfidences: fieldConf,
    imageQuality,
    extractionNotes: cleanValue(parsed.extractionNotes),
  };
}

/**
 * Process multiple labels in parallel for batch processing
 */
export async function analyzeMultipleLabels(
  images: Array<{ base64: string; mimeType: string }>
): Promise<ExtractedLabelData[]> {
  // Process in parallel for faster batch processing
  // Limit concurrency to avoid rate limits
  const BATCH_SIZE = 5;
  const results: ExtractedLabelData[] = [];

  for (let i = 0; i < images.length; i += BATCH_SIZE) {
    const batch = images.slice(i, i + BATCH_SIZE);
    const batchResults = await Promise.all(
      batch.map(img => extractLabelData(img.base64, img.mimeType))
    );
    results.push(...batchResults);
  }

  return results;
}

/**
 * Infer beverage type from extracted class/type designation
 */
export function inferBeverageType(classType: string | undefined): BeverageType {
  if (!classType) return 'distilled_spirits';

  const lower = classType.toLowerCase();

  // Wine indicators (check first as some terms overlap)
  const wineIndicators = [
    'wine', 'champagne', 'prosecco', 'cava', 'sparkling',
    'cabernet', 'merlot', 'chardonnay', 'pinot', 'sauvignon',
    'riesling', 'zinfandel', 'syrah', 'shiraz', 'malbec',
    'sangiovese', 'tempranillo', 'moscato', 'gewürztraminer',
    'port', 'sherry', 'madeira', 'marsala', 'vermouth',
  ];
  
  if (wineIndicators.some(ind => lower.includes(ind))) {
    return 'wine';
  }

  // Beer/Malt beverage indicators
  const beerIndicators = [
    'beer', 'ale', 'lager', 'stout', 'porter', 'pilsner', 'pilsener',
    'ipa', 'india pale', 'hefeweizen', 'wheat beer', 'witbier',
    'bock', 'dunkel', 'märzen', 'oktoberfest', 'kolsch', 'kölsch',
    'saison', 'farmhouse', 'gose', 'sour', 'lambic',
    'malt beverage', 'malt liquor', 'hard seltzer', 'hard cider',
  ];
  
  if (beerIndicators.some(ind => lower.includes(ind))) {
    return 'beer';
  }

  // Spirits indicators (explicit check)
  const spiritsIndicators = [
    'whiskey', 'whisky', 'bourbon', 'scotch', 'rye',
    'vodka', 'gin', 'rum', 'tequila', 'mezcal',
    'brandy', 'cognac', 'armagnac', 'calvados', 'pisco',
    'liqueur', 'cordial', 'schnapps', 'absinthe', 'aquavit',
    'baijiu', 'shochu', 'soju', 'grappa', 'ouzo',
  ];
  
  if (spiritsIndicators.some(ind => lower.includes(ind))) {
    return 'distilled_spirits';
  }

  // Default to distilled spirits for unknown types
  return 'distilled_spirits';
}

/**
 * Validate proof/ABV consistency
 * Proof should equal ABV × 2
 */
export function validateProofAbvConsistency(
  alcoholContent: string | undefined,
  proof: string | undefined
): { isConsistent: boolean; expectedProof?: number; notes?: string } {
  if (!alcoholContent || !proof) {
    return { isConsistent: true }; // Can't validate without both
  }

  // Extract ABV number
  const abvMatch = alcoholContent.match(/(\d+(?:\.\d+)?)\s*%/);
  if (!abvMatch) {
    return { isConsistent: true, notes: 'Could not parse ABV' };
  }
  const abv = parseFloat(abvMatch[1]);

  // Extract proof number
  const proofMatch = proof.match(/(\d+)\s*proof/i);
  if (!proofMatch) {
    return { isConsistent: true, notes: 'Could not parse proof' };
  }
  const proofValue = parseInt(proofMatch[1], 10);

  const expectedProof = Math.round(abv * 2);
  const isConsistent = Math.abs(proofValue - expectedProof) <= 1; // Allow for rounding

  return {
    isConsistent,
    expectedProof,
    notes: isConsistent 
      ? undefined 
      : `Proof/ABV inconsistency: ${proofValue} proof ≠ ${abv}% × 2 = ${expectedProof}`,
  };
}
