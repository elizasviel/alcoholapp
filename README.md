# TTB Label Verifier

An AI-powered alcohol beverage label verification application designed to streamline TTB (Alcohol and Tobacco Tax and Trade Bureau) compliance checking.

![TTB Label Verifier](https://img.shields.io/badge/Status-Prototype-blue) ![Next.js](https://img.shields.io/badge/Next.js-15-black) ![TypeScript](https://img.shields.io/badge/TypeScript-5-blue) ![License](https://img.shields.io/badge/License-MIT-green)

## 🎯 Project Overview

This prototype addresses the challenges faced by TTB compliance agents who manually verify ~150,000 label applications annually. The application uses **Google Gemini 2.5 Flash-Lite** to extract text from label images and compares it against application data, flagging discrepancies for human review.

### Key Features

- **⚡ Fast Verification** - Sub-5-second processing time per label (per Sarah's requirement)
- **🛡️ Conservative Approach** - No false positives; uncertain cases flagged for human review
- **📦 Batch Processing** - Upload and verify up to 300 labels at once (for large importers)
- **👵 Simple UI** - Clean, accessible interface suitable for users of all technical levels
- **📊 Detailed Results** - Field-by-field verification with confidence scores
- **🍷 Beverage-Specific** - TTB-compliant rules for wine, beer, and distilled spirits

## 🏃‍♂️ Quick Start

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Google Gemini API key

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd ttb-label-verifier

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local and add your Gemini API key (GEMINI_API_KEY=your-key)

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to access the application.

### Running Tests

```bash
# Run all tests
npm test

# Run tests once (CI mode)
npm run test:run

# Run with coverage
npm run test:coverage
```

## 🔧 Technical Architecture

### Stack

- **Frontend**: Next.js 15 (App Router), React 19, Tailwind CSS 4, Framer Motion
- **Backend**: Next.js API Routes
- **AI**: Google Gemini 2.5 Flash-Lite (ultra fast, thinking disabled)
- **Testing**: Vitest, React Testing Library

### Project Structure

```
src/
├── app/
│   ├── api/verify/           # API routes for label verification
│   ├── page.tsx              # Main application page
│   └── layout.tsx            # Root layout
├── components/
│   ├── ImageDropzone.tsx     # File upload component
│   ├── ApplicationForm.tsx   # COLA application data form
│   ├── VerificationResults.tsx # Results display
│   └── BatchUpload.tsx       # Batch processing interface
├── lib/
│   ├── gemini.ts             # Google Gemini Flash integration with enhanced prompts
│   ├── verification.ts       # Label verification logic with TTB tolerances
│   └── constraints.ts        # Configurable thresholds and validation rules
├── types/
│   └── index.ts              # TypeScript type definitions
└── data/
    └── ttb-requirements.ts   # Official TTB label requirements (27 CFR Parts 4,5,7,16)

__tests__/
└── verification.test.ts      # Comprehensive unit tests (60+ tests)
```

## 📋 Verification Logic

### TTB Requirements Covered

### What Gets Checked

| Field | Priority | Notes |
|-------|----------|-------|
| **Brand Name** | Critical | Fuzzy matching handles case variations ("STONE'S THROW" vs "Stone's Throw") |
| **Government Warning** | Critical | Must be exact text with "GOVERNMENT WARNING:" in ALL CAPS |
| **Alcohol Content** | Critical | TTB tolerance-based (±0.3% for spirits, ±1.5% for table wine) |
| **Class/Type** | High | Beverage classification verification |
| **Net Contents** | High | Volume verification with standard fill size check |
| **Producer Information** | Medium | Name and address matching |
| **Country of Origin** | Medium | Required for imports |
| **Vintage Year** | Wine only | Validated for wine labels |
| **Appellation** | Wine only | Geographic origin verification |

### TTB Alcohol Content Tolerances

The system uses official TTB tolerances per 27 CFR:

| Beverage Type | Condition | Tolerance |
|--------------|-----------|-----------|
| Distilled Spirits | ≤100 proof (50% ABV) | ±0.3% |
| Distilled Spirits | >100 proof | ±0.15% |
| Wine | Table wine (≤14%) | ±1.5% |
| Wine | Dessert wine (>14%) | ±1.0% |
| Beer | General | ±0.3% |

### Government Warning Requirements

Per 27 CFR Part 16, the health warning statement must:

1. ✅ Begin with **"GOVERNMENT WARNING:"** in ALL CAPS
2. ✅ Be in **bold** type
3. ✅ Contain the exact required text
4. ✅ Appear on a contrasting background
5. ✅ Meet minimum type size requirements based on container size

**Required Text:**
> GOVERNMENT WARNING: (1) According to the Surgeon General, women should not drink alcoholic beverages during pregnancy because of the risk of birth defects. (2) Consumption of alcoholic beverages impairs your ability to drive a car or operate machinery, and may cause health problems.

### Confidence Thresholds

| Range | Classification | Action |
|-------|---------------|--------|
| ≥85% | High confidence | Auto-approve if all fields match |
| 70-84% | Medium confidence | Flag for human review |
| <70% | Low confidence | Flag for human review |

### Status Outcomes

| Status | Description |
|--------|-------------|
| ✅ **APPROVED** | All fields match, government warning valid, high confidence |
| ❌ **REJECTED** | Critical mismatches found (brand name, ABV, missing/incorrect warning) |
| 👁️ **NEEDS REVIEW** | Uncertain results requiring human verification |

## 🛡️ Robustness Features

### OCR Error Handling

The system handles common OCR errors:
- Character substitutions: `0↔O`, `1↔l/I`, `5↔S`, `8↔B`
- Smart quote normalization: `'` → `'`, `"` → `"`
- Possessive handling: `Stone's` = `Stones`
- Whitespace normalization

### Image Quality Detection

The AI extraction assesses image quality and flags issues:
- `blur` - Out of focus
- `low_resolution` - Insufficient detail
- `glare` - Reflections obscuring text
- `angle_distortion` - Label at an angle
- `partial_occlusion` - Part of label hidden
- `poor_lighting` - Too dark or overexposed
- `text_cut_off` - Label extends beyond frame

Poor image quality triggers human review recommendation.

### Standard Fill Size Validation

Non-standard container sizes are flagged:

| Beverage | Standard Sizes (mL) |
|----------|-------------------|
| Spirits | 50, 100, 200, 375, 750, 1000, 1750 |
| Wine | 187, 375, 500, 750, 1000, 1500, 3000 |
| Beer | 355, 473, 650, 946 (12, 16, 22, 32 fl oz) |

## 🔒 Design Principles

### No False Positives

The system is designed to be **conservative**. When in doubt, it flags for human review rather than risking an incorrect approval. This aligns with regulatory requirements where false negatives are acceptable but false positives are not.

```typescript
// Decision hierarchy
1. Government warning missing/incorrect → REJECT
2. Brand name complete mismatch → REJECT
3. Alcohol content outside tolerance → REJECT
4. Confidence < 70% → NEEDS REVIEW
5. Similar but not exact matches → NEEDS REVIEW
6. All fields match + high confidence → APPROVED
```

### Performance Target

The previous vendor pilot failed because processing took 30-40 seconds per label. This application targets **<5 seconds** per label to ensure agent adoption.

### Accessibility

Designed for users with varying technical comfort levels, from experienced agents to those less familiar with technology. The interface prioritizes:
- Large, clearly labeled buttons
- Obvious feedback and status indicators
- Simple, linear workflows
- No hunting for buttons (per Dave's feedback)

## 🧪 Testing

### Test Coverage (60+ tests)

- **Text Normalization** - Whitespace, quotes, dashes
- **String Similarity** - Levenshtein distance calculations
- **Semantic Matching** - OCR error handling, possessives
- **Field Comparisons** - Brand names, alcohol content, net contents
- **TTB Tolerances** - Beverage-specific tolerance calculations
- **Government Warning** - ALL CAPS, exact text, detailed issues
- **Full Verification** - End-to-end workflow tests
- **Wine-Specific** - Vintage, appellation verification
- **Beer-Specific** - Imperial/metric conversion
- **Performance** - 1000 verifications in <1 second

```bash
# Run with coverage report
npm run test:coverage
```

## 📦 Deployment

### Vercel (Recommended)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Set environment variable
vercel env add GEMINI_API_KEY
```

### Docker

```dockerfile
# Build
docker build -t ttb-label-verifier .

# Run
docker run -p 3000:3000 -e GEMINI_API_KEY=your-key ttb-label-verifier
```

## 🔮 Future Enhancements

1. **COLA System Integration** - Direct connection to TTB's existing infrastructure
2. **Historical Data Analysis** - Learning from past approvals/rejections
3. **Multi-angle Image Processing** - Enhanced handling of labels at various angles
4. **Barcode/QR Reading** - Automated product identification
5. **Audit Trail** - Complete logging for compliance purposes
6. **Allergen Labeling** - Support for upcoming TTB allergen disclosure requirements
7. **PDF Label Support** - Direct COLA application PDF verification

## ⚠️ Limitations & Trade-offs

1. **Prototype Status** - Not production-ready; requires security hardening
2. **API Dependency** - Relies on Google Gemini API availability
3. **Image Quality** - Performance degrades with poor image quality
4. **Network Blocks** - Some government networks block external API calls
5. **Bold Detection** - Cannot reliably verify if government warning is in bold via OCR

## 📚 TTB References

- [TTB Wine Label Requirements (27 CFR Part 4)](https://www.ttb.gov/regulated-commodities/beverage-alcohol/wine/anatomy-of-a-label)
- [TTB Beer Label Requirements (27 CFR Part 7)](https://www.ttb.gov/regulated-commodities/beverage-alcohol/beer/labeling/anatomy-of-a-malt-beverage-label-tool)
- [TTB Spirits Label Requirements (27 CFR Part 5)](https://www.ttb.gov/regulated-commodities/beverage-alcohol/distilled-spirits/ds-labeling-home/anatomy-of-a-distilled-spirits-label-tool)
- [Health Warning Statement (27 CFR Part 16)](https://www.ecfr.gov/current/title-27/chapter-I/subchapter-A/part-16)
- [TTB Form 5100.31 (COLA Application)](https://www.ttb.gov/system/files?file=images/pdfs/forms/f510031.pdf)

## 📊 Stakeholder Requirements Met

| Requirement | Source | Status |
|-------------|--------|--------|
| <5 second processing | Sarah Chen | ✅ Implemented |
| Handle case variations | Dave Morrison | ✅ Semantic matching |
| ALL CAPS warning check | Jenny Park | ✅ Strict validation |
| Batch processing (300+) | Janet (Seattle) | ✅ Supported |
| Simple interface | Sarah Chen | ✅ Clean UI |
| No false positives | Marcus Williams | ✅ Conservative approach |
| Standalone operation | Marcus Williams | ✅ No COLA integration |

## 📄 License

MIT License - See [LICENSE](LICENSE) for details.

---

Built with ❤️ for the TTB take-home project
# alcoholapp
