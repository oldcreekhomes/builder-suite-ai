

## Smart PO Line Matching with Confidence Scores — IMPLEMENTED

### What Was Built

1. **`src/utils/poLineMatching.ts`** — Pure matching utility that scores PO lines against bill lines using:
   - Keyword matching (bill memo vs PO line description, 45% weight)
   - Cost code matching (30% weight)
   - Amount proximity (25% weight)

2. **`POSelectionDropdown.tsx`** — Added `confidence` prop that renders a colored percentage badge:
   - Green (≥80%): High confidence match
   - Yellow (50-79%): Medium confidence
   - Gray (<50%): Low confidence

3. **`EditExtractedBillDialog.tsx`** — Auto-matches bill lines to PO lines when PO data loads, with confidence scores

4. **`ManualBillEntry.tsx`** — Smart matching on cost code selection, memo blur, and amount blur
