

## Smart PO Line Matching with Confidence Scores

### Overview
When a bill is being entered (both AI-extracted and manual), the system will intelligently match each bill line item to a specific PO line based on text similarity (description keywords like "decks", "siding", "framing") and amount proximity -- not just cost code matching. A confidence score will be displayed next to the PO selection so users know how reliable the match is.

### How Matching Works Today
- Current matching is **cost-code-only**: if a bill line has cost code "4370: Framing Labor" and a PO exists for that same cost code, it matches.
- This fails when the vendor has ONE PO with many line items sharing the same cost code (e.g., PO 2025-115E-0006 has 10+ lines all under "4370: Framing Labor" for different scopes: "Decks", "First floor", "2nd floor", etc.).
- There is no text-based matching of bill descriptions to PO line descriptions.

### What Changes

**1. New utility: `src/utils/poLineMatching.ts`**

A pure function that scores and ranks PO lines against a bill line item using multiple signals:

| Signal | Weight | Example |
|--------|--------|---------|
| **Keyword match** (bill memo vs PO line description) | High | Bill says "decks" -- PO line "Decks" = strong match |
| **Cost code match** (bill cost_code_id vs PO line cost_code_id) | High | Same cost code = baseline match |
| **Amount proximity** (bill amount vs PO line amount or remaining) | Medium | Bill $1,032 vs PO line $2,232 remaining = plausible |
| **Exact amount match** (bill amount equals PO line amount or remaining exactly) | Bonus | Bill $720 = PO line $700 remaining = near-exact |

**Confidence scoring:**
- **100%**: Exact keyword match + same cost code + amount within 5%
- **80-99%**: Strong keyword match + same cost code (amount may differ)
- **50-79%**: Partial keyword overlap or cost code match only with reasonable amount
- **Below 50%**: Weak/no keyword match, cost code mismatch

The function returns a ranked list of PO line candidates with confidence scores.

**2. Update `EditExtractedBillDialog.tsx` (AI Extracted Bills)**

After loading bill lines and PO data:
- For each job cost line, run the matching function against all PO lines for this vendor/project
- Auto-assign `purchase_order_id` and `purchase_order_line_id` for matches above 50% confidence
- Store the confidence score in local state

**3. Update `ManualBillEntry.tsx` (Manual Bills)**

When a user enters/changes the memo or cost code on a job cost row:
- Run the matching function to suggest a PO line
- Auto-populate the PO dropdown if confidence >= 50%

**4. Update `POSelectionDropdown.tsx` (Confidence Display)**

- Accept an optional `confidence` prop (number 0-100)
- When present, display a small badge next to the PO dropdown:
  - **Green** badge: "100%" or "95%" for high confidence
  - **Yellow/amber** badge: "75%" for medium confidence  
  - **Gray** badge: "< 50%" for low confidence
- Format: a small pill/badge to the right of the dropdown showing e.g. `Confidence: 85%`

### Technical Details

**New file: `src/utils/poLineMatching.ts`**

```text
Interface:
  matchBillLineToPOLines(
    billMemo: string,
    billAmount: number,
    billCostCodeId: string | undefined,
    poLines: Array<{
      id: string,
      purchase_order_id: string,
      description: string | null,
      cost_code_id: string | null,
      cost_code_name: string | null,
      amount: number,
      remaining: number
    }>
  ) => Array<{ poLineId: string, poId: string, confidence: number }>
```

Matching algorithm:
1. Tokenize bill memo into keywords (lowercase, strip punctuation)
2. For each PO line:
   a. Tokenize PO line description + cost code name
   b. Calculate keyword overlap score (Jaccard similarity or substring containment)
   c. Check cost code ID match (boolean bonus)
   d. Calculate amount proximity score (1 - |diff| / max)
   e. Weighted sum to produce confidence percentage
3. Sort by confidence descending, return top matches

**Modified files:**

- `src/components/bills/EditExtractedBillDialog.tsx` -- After loading lines, fetch vendor POs and auto-match each line using the utility. Store confidence per line in state. Pass confidence to POSelectionDropdown.

- `src/components/bills/ManualBillEntry.tsx` -- When memo/amount/cost code changes on a row, re-run matching. Auto-set PO if confidence >= 50%. Pass confidence to POSelectionDropdown.

- `src/components/bills/POSelectionDropdown.tsx` -- Add optional `confidence?: number` prop. Render a small colored badge showing the confidence percentage when auto-matched.

### User Experience

Before: User enters a bill with 3 line items. PO dropdown shows "Auto-match by cost code" but doesn't actually match to specific PO lines. User manually searches through 10+ PO lines.

After: 
- Line "Decks - $1,032" auto-matches to PO line "Decks" ($2,232) with **Confidence: 95%** (green)
- Line "Siding - $3,500" auto-matches to PO "Siding" ($11,220) with **Confidence: 90%** (green)  
- Line "Framing - $720" auto-matches to PO line with closest amount near $720 with **Confidence: 75%** (yellow) since multiple framing lines exist

The user can always override the auto-match via the dropdown.

