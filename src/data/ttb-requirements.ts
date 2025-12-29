/**
 * TTB (Alcohol and Tobacco Tax and Trade Bureau) Label Requirements
 * 
 * Comprehensive data structure based on official TTB regulations:
 * - 27 CFR Part 4: Wine Labeling
 * - 27 CFR Part 5: Distilled Spirits Labeling  
 * - 27 CFR Part 7: Malt Beverage Labeling
 * - 27 CFR Part 16: Health Warning Statement
 * 
 * Sources:
 * - Wine: https://www.ttb.gov/regulated-commodities/beverage-alcohol/wine/anatomy-of-a-label
 * - Beer: https://www.ttb.gov/regulated-commodities/beverage-alcohol/beer/labeling/anatomy-of-a-malt-beverage-label-tool
 * - Spirits: https://www.ttb.gov/regulated-commodities/beverage-alcohol/distilled-spirits/ds-labeling-home/anatomy-of-a-distilled-spirits-label-tool
 */

import { BeverageType } from '@/types';

/**
 * Mandatory label element definition
 */
export interface MandatoryElement {
  field: string;
  displayName: string;
  required: boolean | 'imports_only' | 'if_applicable' | 'state_dependent';
  verifiable: boolean; // Can be verified via OCR
  description: string;
  examples?: string[];
  validationRules?: string[];
}

/**
 * Enhanced TTB Requirements with validation rules
 */
export const TTB_REQUIREMENTS = {
  // ═══════════════════════════════════════════════════════════════════════════
  // GOVERNMENT WARNING STATEMENT - 27 CFR Part 16
  // ═══════════════════════════════════════════════════════════════════════════
  GOVERNMENT_WARNING: {
    text: `GOVERNMENT WARNING: (1) According to the Surgeon General, women should not drink alcoholic beverages during pregnancy because of the risk of birth defects. (2) Consumption of alcoholic beverages impairs your ability to drive a car or operate machinery, and may cause health problems.`,
    
    formattingRequirements: {
      prefix: {
        text: 'GOVERNMENT WARNING:',
        mustBeAllCaps: true,
        mustBeBold: true,
        mustBeConspicuous: true,
      },
      body: {
        mustBeContinuousParagraph: true,
        mustBeSeparateFromOtherText: true,
        mustBeOnContrastingBackground: true,
      },
    },
    
    // Minimum type sizes per 27 CFR 16.22
    minimumTypeSizes: [
      { description: 'Containers ≤ 237 mL (8 fl oz)', maxVolumeMl: 237, typeSizeMm: 1 },
      { description: 'Containers 237 mL to 3 L', maxVolumeMl: 3000, typeSizeMm: 2 },
      { description: 'Containers ≥ 3 L', minVolumeMl: 3000, typeSizeMm: 3 },
    ],
    
    // Required phrases that MUST appear (for validation)
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
    
    exceptions: [
      'Containers of 50 mL or less are exempt if impractical to affix label',
      'Alcohol for export only (if labeled for export)',
      'Sacramental wine in containers ≤ 32 fl oz',
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // DISTILLED SPIRITS - 27 CFR Part 5
  // ═══════════════════════════════════════════════════════════════════════════
  DISTILLED_SPIRITS: {
    mandatoryElements: [
      {
        field: 'brandName',
        displayName: 'Brand Name',
        required: true,
        verifiable: true,
        description: 'The brand name under which the product is sold',
        examples: ['OLD TOM DISTILLERY', 'MAKER\'S MARK', 'GREY GOOSE'],
        validationRules: [
          'Must not be misleading about age, origin, or identity',
          'Must be displayed prominently on the brand label',
        ],
      },
      {
        field: 'classType',
        displayName: 'Class and Type',
        required: true,
        verifiable: true,
        description: 'The class/type designation (e.g., "Kentucky Straight Bourbon Whiskey")',
        examples: ['Vodka', 'Gin', 'Kentucky Straight Bourbon Whiskey', 'Blended Scotch Whisky'],
        validationRules: [
          'Must accurately describe the product per TTB standards of identity',
          'Whiskey spelling varies: "Whiskey" for American/Irish, "Whisky" for Scotch/Canadian',
        ],
      },
      {
        field: 'alcoholContent',
        displayName: 'Alcohol Content',
        required: true,
        verifiable: true,
        description: 'Percentage of alcohol by volume',
        examples: ['40% Alc./Vol.', '45% ABV', '80 Proof'],
        validationRules: [
          'Must be stated as "XX% Alc./Vol." or "XX% Alcohol by Volume"',
          'Proof statement optional but if included, must equal ABV × 2',
          'Tolerance: ±0.3% for spirits ≤100 proof, ±0.15% for spirits >100 proof',
        ],
      },
      {
        field: 'netContents',
        displayName: 'Net Contents',
        required: true,
        verifiable: true,
        description: 'Volume of the container',
        examples: ['750 mL', '1 L', '1.75 L', '50 mL'],
        validationRules: [
          'Must be in metric units for distilled spirits',
          'Standard sizes: 50, 100, 200, 375, 750, 1000, 1750 mL',
        ],
      },
      {
        field: 'producerName',
        displayName: 'Name and Address',
        required: true,
        verifiable: true,
        description: 'Name and address of the distiller, bottler, or importer',
        examples: ['Bottled by XYZ Distillery, Louisville, KY'],
        validationRules: [
          'Must include city and state (or country for imports)',
          'May include "Distilled by", "Bottled by", or "Imported by"',
        ],
      },
      {
        field: 'countryOfOrigin',
        displayName: 'Country of Origin',
        required: 'imports_only',
        verifiable: true,
        description: 'Country where the product was produced (required for imports)',
        examples: ['Product of Scotland', 'Made in Mexico', 'Imported from France'],
      },
      {
        field: 'governmentWarning',
        displayName: 'Health Warning Statement',
        required: true,
        verifiable: true,
        description: 'Mandatory government health warning',
      },
      {
        field: 'ageStatement',
        displayName: 'Age Statement',
        required: 'if_applicable',
        verifiable: true,
        description: 'Age of the youngest spirit in the blend (if aged less than 4 years for whiskey)',
        examples: ['Aged 2 Years', '10 Years Old'],
        validationRules: [
          'Required for whiskey aged less than 4 years',
          'Must state age of youngest component in blend',
        ],
      },
    ],

    // Standard classes and types
    classTypes: {
      whiskey: [
        'Bourbon Whisky',
        'Bourbon Whiskey', 
        'Kentucky Straight Bourbon Whiskey',
        'Tennessee Whiskey',
        'Rye Whisky',
        'Rye Whiskey',
        'Corn Whisky',
        'Wheat Whisky',
        'Malt Whisky',
        'Blended Whisky',
        'Blended Whiskey',
        'Light Whisky',
        'Spirit Whisky',
      ],
      scotch: [
        'Scotch Whisky',
        'Blended Scotch Whisky',
        'Single Malt Scotch Whisky',
        'Blended Malt Scotch Whisky',
      ],
      irish: ['Irish Whiskey', 'Single Pot Still Irish Whiskey', 'Single Malt Irish Whiskey'],
      canadian: ['Canadian Whisky', 'Canadian Rye Whisky'],
      vodka: ['Vodka', 'Flavored Vodka'],
      gin: ['Gin', 'Distilled Gin', 'London Dry Gin', 'Old Tom Gin', 'Plymouth Gin'],
      brandy: ['Brandy', 'Grape Brandy', 'Cognac', 'Armagnac', 'Pisco', 'Calvados'],
      rum: ['Rum', 'Gold Rum', 'Dark Rum', 'White Rum', 'Spiced Rum', 'Aged Rum', 'Cachaça'],
      tequila: ['Tequila', 'Tequila Blanco', 'Tequila Reposado', 'Tequila Añejo', 'Mezcal'],
      liqueur: ['Liqueur', 'Cordial', 'Crème de'],
      other: ['Absinthe', 'Aquavit', 'Bitters', 'Sake'],
    },

    // Alcohol content rules
    alcoholContent: {
      format: 'XX% Alc./Vol. or XX% Alcohol by Volume',
      proofOptional: true,
      proofFormula: 'Proof = ABV × 2',
      tolerances: {
        standard: 0.3,   // ±0.3% for spirits 100 proof and under
        highProof: 0.15, // ±0.15% for spirits over 100 proof
      },
      minimums: {
        whiskey: 40, // 80 proof minimum
        brandy: 40,
        rum: 40,
        vodka: 40,
        gin: 40,
        tequila: 35,
      },
    },

    // Standard fill sizes (metric)
    standardFillSizes: [50, 100, 200, 375, 750, 1000, 1750], // mL
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // WINE - 27 CFR Part 4
  // ═══════════════════════════════════════════════════════════════════════════
  WINE: {
    mandatoryElements: [
      {
        field: 'brandName',
        displayName: 'Brand Name',
        required: true,
        verifiable: true,
        description: 'The brand name or trade name',
        examples: ['CHATEAU MARGAUX', 'KENDALL-JACKSON', 'YELLOW TAIL'],
      },
      {
        field: 'classType',
        displayName: 'Class/Type',
        required: true,
        verifiable: true,
        description: 'Type designation (varietal, generic, or semi-generic)',
        examples: ['Cabernet Sauvignon', 'Chardonnay', 'Red Wine', 'Champagne'],
        validationRules: [
          'Varietal names require 75% (or 85% for AVA) of that grape variety',
          'Some names like Champagne are protected appellations',
        ],
      },
      {
        field: 'alcoholContent',
        displayName: 'Alcohol Content',
        required: true,
        verifiable: true,
        description: 'Alcohol percentage by volume',
        examples: ['13.5% Alc./Vol.', '14% Alcohol by Volume', 'Table Wine'],
        validationRules: [
          'Wines 7-14% may use "Table Wine" or "Light Wine" instead of numeric %',
          'Tolerance: ±1.5% for wines 14% and under, ±1% for wines over 14%',
        ],
      },
      {
        field: 'netContents',
        displayName: 'Net Contents',
        required: true,
        verifiable: true,
        description: 'Volume of the container',
        examples: ['750 mL', '1.5 L', '3 L'],
      },
      {
        field: 'producerName',
        displayName: 'Name and Address',
        required: true,
        verifiable: true,
        description: 'Name and address of the bottler, packer, or importer',
        examples: ['Bottled by XYZ Winery, Napa, CA', 'Vinted and Bottled by'],
      },
      {
        field: 'countryOfOrigin',
        displayName: 'Country of Origin',
        required: 'imports_only',
        verifiable: true,
        description: 'Country where wine was produced',
        examples: ['Product of France', 'Product of Italy'],
      },
      {
        field: 'governmentWarning',
        displayName: 'Health Warning Statement',
        required: true,
        verifiable: true,
        description: 'Mandatory government health warning',
      },
      {
        field: 'containsSulfites',
        displayName: 'Sulfite Declaration',
        required: 'if_applicable',
        verifiable: true,
        description: 'Required if wine contains 10+ ppm sulfites',
        examples: ['Contains Sulfites'],
        validationRules: ['Required for wines containing ≥10 ppm sulfur dioxide'],
      },
      {
        field: 'vintageYear',
        displayName: 'Vintage Year',
        required: false,
        verifiable: true,
        description: 'Year the grapes were harvested',
        examples: ['2019', '2021'],
        validationRules: [
          '95% of grapes must be from stated year (general)',
          '85% of grapes must be from stated year (for AVA wines)',
        ],
      },
      {
        field: 'appellation',
        displayName: 'Appellation of Origin',
        required: false,
        verifiable: true,
        description: 'Geographic origin of the grapes',
        examples: ['Napa Valley', 'Sonoma Coast', 'Willamette Valley'],
        validationRules: [
          'State appellation: 75% from that state',
          'County appellation: 75% from that county',
          'AVA appellation: 85% from that AVA',
          'Estate: 100% estate grown',
        ],
      },
    ],

    // Wine types and varietals
    classTypes: {
      tableWine: ['Table Wine', 'Light Wine', 'Red Wine', 'White Wine', 'Rosé Wine', 'Blush Wine'],
      dessertWine: ['Dessert Wine', 'Port', 'Sherry', 'Madeira', 'Marsala'],
      sparklingWine: ['Sparkling Wine', 'Champagne', 'Prosecco', 'Cava', 'Crémant'],
      varietals: [
        // Red
        'Cabernet Sauvignon', 'Merlot', 'Pinot Noir', 'Syrah', 'Shiraz', 'Zinfandel',
        'Malbec', 'Sangiovese', 'Tempranillo', 'Nebbiolo', 'Grenache', 'Petite Sirah',
        // White
        'Chardonnay', 'Sauvignon Blanc', 'Riesling', 'Pinot Grigio', 'Pinot Gris',
        'Viognier', 'Gewürztraminer', 'Moscato', 'Chenin Blanc', 'Albariño',
        // Rosé
        'White Zinfandel', 'Rosé of Pinot Noir',
      ],
    },

    // Appellation rules per 27 CFR 4.25
    appellationRules: {
      state: { minPercentage: 75, description: '75% from grapes grown in the named state' },
      county: { minPercentage: 75, description: '75% from grapes grown in the named county' },
      ava: { minPercentage: 85, description: '85% from grapes grown in the named AVA' },
      estate: { 
        minPercentage: 100, 
        description: '100% from grapes grown on estate land within a single AVA, and wine fully finished on the estate',
      },
    },

    // Vintage rules per 27 CFR 4.27
    vintageRules: {
      general: { minPercentage: 95 },
      ava: { minPercentage: 85 },
    },

    // Varietal labeling rules
    varietalRules: {
      general: { minPercentage: 75, description: '75% of named variety required' },
      ava: { minPercentage: 85, description: '85% of named variety for AVA wines' },
    },

    // Alcohol content rules
    alcoholContent: {
      tableWine: { min: 7, max: 14, tolerance: 1.5 },
      dessertWine: { min: 14, max: 24, tolerance: 1.0 },
      exceptions: {
        tableWineDesignation: 'Wines 7-14% may use "Table Wine" instead of numeric ABV',
        lightWineDesignation: 'Wines 7-14% may use "Light Wine" instead of numeric ABV',
      },
    },

    // Standard fill sizes
    standardFillSizes: [187, 375, 500, 750, 1000, 1500, 3000], // mL
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // MALT BEVERAGES / BEER - 27 CFR Part 7
  // ═══════════════════════════════════════════════════════════════════════════
  MALT_BEVERAGES: {
    mandatoryElements: [
      {
        field: 'brandName',
        displayName: 'Brand Name',
        required: true,
        verifiable: true,
        description: 'The brand name of the malt beverage',
        examples: ['BUDWEISER', 'HEINEKEN', 'SIERRA NEVADA'],
      },
      {
        field: 'classType',
        displayName: 'Class Designation',
        required: true,
        verifiable: true,
        description: 'The class/type of malt beverage',
        examples: ['Beer', 'Ale', 'Lager', 'Stout', 'Porter'],
      },
      {
        field: 'producerName',
        displayName: 'Name and Address',
        required: true,
        verifiable: true,
        description: 'Name and address of brewer, bottler, or importer',
        examples: ['Brewed by XYZ Brewing Co., Portland, OR'],
      },
      {
        field: 'netContents',
        displayName: 'Net Contents',
        required: true,
        verifiable: true,
        description: 'Volume of the container',
        examples: ['12 fl oz', '16 fl oz', '22 fl oz'],
        validationRules: [
          'May use fluid ounces or metric units',
          'Common sizes: 12 fl oz, 16 fl oz, 22 fl oz (bomber), 32 fl oz (crowler)',
        ],
      },
      {
        field: 'countryOfOrigin',
        displayName: 'Country of Origin',
        required: 'imports_only',
        verifiable: true,
        description: 'Country where the beer was produced',
        examples: ['Product of Germany', 'Brewed in Belgium'],
      },
      {
        field: 'governmentWarning',
        displayName: 'Health Warning Statement',
        required: true,
        verifiable: true,
        description: 'Mandatory government health warning',
      },
      {
        field: 'alcoholContent',
        displayName: 'Alcohol Content',
        required: 'state_dependent',
        verifiable: true,
        description: 'ABV percentage (optional at federal level, may be required by state)',
        examples: ['5.0% Alc./Vol.', '7.2% ABV'],
        validationRules: [
          'Not required by TTB, but may be required by state law',
          'If stated, must be accurate within tolerance',
        ],
      },
    ],

    // Beer class types
    classTypes: [
      // Lagers
      'Lager', 'Pilsner', 'Helles', 'Märzen', 'Oktoberfest', 'Bock', 'Doppelbock',
      'Dunkel', 'Schwarzbier', 'Vienna Lager', 'American Lager', 'Light Lager',
      // Ales
      'Ale', 'Pale Ale', 'India Pale Ale', 'IPA', 'Double IPA', 'New England IPA',
      'Amber Ale', 'Red Ale', 'Brown Ale', 'Blonde Ale', 'Golden Ale',
      // Dark Ales
      'Porter', 'Stout', 'Imperial Stout', 'Milk Stout', 'Oatmeal Stout',
      // Wheat Beers
      'Wheat Beer', 'Hefeweizen', 'Witbier', 'Belgian White',
      // Belgian
      'Belgian Ale', 'Dubbel', 'Tripel', 'Quadrupel', 'Saison', 'Farmhouse Ale',
      // Specialty
      'Malt Beverage', 'Malt Liquor', 'Hard Seltzer', 'Flavored Malt Beverage',
      'Sour Beer', 'Gose', 'Berliner Weisse', 'Fruit Beer', 'Barrel-Aged Beer',
    ],

    // ABV is optional at federal level per 27 CFR 7.63
    alcoholContentOptional: true,
    alcoholContent: {
      tolerance: 0.3, // If stated, must be accurate within ±0.3%
    },

    // Common fill sizes (fluid ounces and mL equivalents)
    standardFillSizes: {
      imperial: ['12 fl oz', '16 fl oz', '19.2 fl oz', '22 fl oz', '24 fl oz', '32 fl oz'],
      metric: [355, 473, 568, 650, 710, 946], // mL
    },
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// SAMPLE TEST LABELS
// ═══════════════════════════════════════════════════════════════════════════
export const SAMPLE_LABELS = {
  distilledSpirits: [
    {
      brandName: 'OLD TOM DISTILLERY',
      fancifulName: 'Reserve Collection',
      classType: 'Kentucky Straight Bourbon Whiskey',
      alcoholContent: '45% Alc./Vol.',
      proof: '90 Proof',
      netContents: '750 mL',
      producerName: 'Old Tom Distilling Co.',
      producerAddress: 'Louisville, KY',
      countryOfOrigin: 'United States',
    },
    {
      brandName: 'SILVER CREEK',
      classType: 'Vodka',
      alcoholContent: '40% Alc./Vol.',
      netContents: '1 L',
      producerName: 'Silver Creek Spirits LLC',
      producerAddress: 'Austin, TX',
      countryOfOrigin: 'United States',
    },
    {
      brandName: 'HIGHLAND MIST',
      classType: 'Blended Scotch Whisky',
      alcoholContent: '43% Alc./Vol.',
      netContents: '750 mL',
      producerName: 'Highland Mist Distillery',
      producerAddress: 'Speyside, Scotland',
      countryOfOrigin: 'Product of Scotland',
    },
  ],
  wine: [
    {
      brandName: 'VALLEY OAKS',
      classType: 'Cabernet Sauvignon',
      alcoholContent: '14.5% Alc./Vol.',
      netContents: '750 mL',
      producerName: 'Valley Oaks Winery',
      producerAddress: 'Napa Valley, CA',
      countryOfOrigin: 'United States',
      vintageYear: '2019',
      appellation: 'Napa Valley',
      containsSulfites: true,
    },
    {
      brandName: 'CHATEAU LUMIERE',
      classType: 'Chardonnay',
      alcoholContent: '13.5% Alc./Vol.',
      netContents: '750 mL',
      producerName: 'Chateau Lumiere Vineyards',
      producerAddress: 'Sonoma, CA',
      countryOfOrigin: 'United States',
      vintageYear: '2021',
      appellation: 'Sonoma Coast',
      containsSulfites: true,
    },
  ],
  beer: [
    {
      brandName: 'IRONWORKS',
      classType: 'India Pale Ale',
      alcoholContent: '6.8% Alc./Vol.',
      netContents: '12 fl oz',
      producerName: 'Ironworks Brewing Company',
      producerAddress: 'Portland, OR',
      countryOfOrigin: 'United States',
    },
    {
      brandName: 'GOLDEN HARVEST',
      classType: 'Lager',
      alcoholContent: '5.0% Alc./Vol.',
      netContents: '16 fl oz',
      producerName: 'Golden Harvest Brewery',
      producerAddress: 'Milwaukee, WI',
      countryOfOrigin: 'United States',
    },
  ],
};

// ═══════════════════════════════════════════════════════════════════════════
// TTB COLA APPLICATION REFERENCE
// ═══════════════════════════════════════════════════════════════════════════
export const COLA_APPLICATION_FIELDS = {
  formNumber: 'TTB F 5100.31',
  formName: 'Application for and Certification/Exemption of Label/Bottle Approval',
  website: 'https://www.ttb.gov/cola',
  sections: {
    applicantInfo: [
      'Permit Number (Basic Permit or Brewer\'s Notice)',
      'Registry Number',
      'Plant/Winery/Brewery Number',
      'Applicant Name',
      'Applicant Address',
    ],
    productInfo: [
      'Brand Name',
      'Fanciful Name',
      'Class/Type',
      'Alcohol Content',
      'Net Contents',
      'Age Statement (if applicable)',
      'Country of Origin',
    ],
    labelInfo: [
      'Label Size (height × width)',
      'Label Description',
      'Type of Application (Original/Revision/Resubmission)',
    ],
    certifications: [
      'Certificate of Label Approval (COLA)',
      'Certificate of Exemption from Label Approval (CELA)',
      'Distinctive Liquor Bottle Approval',
    ],
  },
};

/**
 * Helper function to get mandatory elements for a beverage type
 */
export function getMandatoryElements(beverageType: BeverageType): MandatoryElement[] {
  switch (beverageType) {
    case 'wine':
      return TTB_REQUIREMENTS.WINE.mandatoryElements;
    case 'beer':
      return TTB_REQUIREMENTS.MALT_BEVERAGES.mandatoryElements;
    case 'distilled_spirits':
      return TTB_REQUIREMENTS.DISTILLED_SPIRITS.mandatoryElements;
    default:
      return TTB_REQUIREMENTS.DISTILLED_SPIRITS.mandatoryElements;
  }
}

/**
 * Helper function to check if alcohol content is required for a beverage type
 */
export function isAlcoholContentRequired(beverageType: BeverageType): boolean {
  // Beer ABV is optional at federal level (may be required by state)
  if (beverageType === 'beer') return false;
  return true;
}

/**
 * Helper function to get standard fill sizes for a beverage type
 */
export function getStandardFillSizes(beverageType: BeverageType): number[] {
  switch (beverageType) {
    case 'wine':
      return TTB_REQUIREMENTS.WINE.standardFillSizes;
    case 'beer':
      return TTB_REQUIREMENTS.MALT_BEVERAGES.standardFillSizes.metric;
    case 'distilled_spirits':
      return TTB_REQUIREMENTS.DISTILLED_SPIRITS.standardFillSizes;
    default:
      return TTB_REQUIREMENTS.DISTILLED_SPIRITS.standardFillSizes;
  }
}
