

## Fix PO Matching for Multi-Item Invoices

### Root Cause Analysis

The invoice INV0021 from Four Seasons contains three clear line items in its body text:
- "Deck balance - $1,032"
- "Siding draw - $3,500"  
- "Added wall around piles ground floor 3 men 8hrs at $30 - $720"

**Problem 1 (AI Extraction):** The AI lumps all three items into a SINGLE line item with `description = "115 E Oceanwatch Ct...\nDeck balance -$1032\nSiding draw -$3500\n..."` and `amount = $5,252`. It never splits them into 3 separate lines.

**Problem 2 (Frontend):** When the Edit dialog loads, it reads `line.memo` (which is `null`) for PO matching -- but the rich text is sitting in `line.description`. The matching utility never sees keywords like "decks" or "siding".

The PO data has perfect matches available:
- PO line "Decks" for $2,232 (PO 2025-115E-0006)
- PO "Siding" for $11,220 (PO 2025-115E-0003)
- PO line "Ground floor" or "EXT: Frame basement walls" for $720

### Fix: Two Changes

---

#### 1. Edge Function: Teach AI to Split Multi-Item Invoices

**File: `supabase/functions/extract-bill-data/index.ts`**

Add explicit instructions to the system prompt telling the AI that when an invoice body contains multiple line items with individual amounts (e.g., "Deck balance - $1032 / Siding draw - $3500 / ..."), it MUST extract each as a separate `line_items` entry with its own description and amount -- not a single combined entry.

Add this to the prompt (after the existing "SMART COST CODE ASSIGNMENT RULES" section, around line 775):

```text
MULTI-ITEM INVOICE SPLITTING RULES:
- When an invoice body contains MULTIPLE items with individual dollar amounts 
  (e.g., "Deck balance - $1032 / Siding draw - $3500 / Framing - $720"), 
  you MUST create SEPARATE line_items for EACH item.
- Each line item gets its own description, quantity, unit_cost, and amount.
- DO NOT combine multiple items into a single line_items entry.
- The sum of all line item amounts should equal the total_amount.
- Common patterns: draw schedules, progress billing, multi-scope invoices.
- Each line item should be categorized with its own cost_code_name based 
  on its description (e.g., "Deck" -> framing/carpentry code, "Siding" -> siding code).
```

This way the AI will produce 3 lines instead of 1, each with a proper description that the matching utility can use.

---

#### 2. Frontend: Use `description` as Memo Fallback for Matching

**File: `src/components/bills/EditExtractedBillDialog.tsx`**

Even with the prompt fix, existing bills or edge cases may still produce lines where `memo` is null but `description` has useful text. Two changes:

**a) When loading lines (around line 225):** Change `memo: line.memo || ""` to `memo: line.memo || line.description || ""`. This ensures the matching utility always has text to work with.

**b) In the PO auto-match effect (around line 389):** The matching already uses `line.memo` -- no additional change needed since we fixed the source.

This is a small but critical fallback: if the description says "Deck balance -$1032 / Siding draw..." and memo is null, we use description so the keyword matching can find "deck", "siding", etc.

### Expected Result After Fix

When the user uploads INV0021 again:

1. AI extraction creates 3 separate line items:
   - Line 1: "Deck balance" / $1,032 / cost code: 4370 Framing Labor
   - Line 2: "Siding draw" / $3,500 / cost code: 4470 Siding  
   - Line 3: "Added wall around piles..." / $720 / cost code: 4370 Framing Labor

2. When Edit dialog opens, the matching utility runs on each line:
   - "Deck balance" matches PO line "Decks" ($2,232) -- keyword "deck" matches
   - "Siding draw" matches PO "Siding" ($11,220) -- keyword "siding" matches
   - "wall around piles ground floor" matches PO line "Ground floor" ($3,177) -- keyword "ground floor" matches

3. Each line shows a confidence badge (green/yellow) next to the PO dropdown.

### Files to Edit

| File | Change |
|------|--------|
| `supabase/functions/extract-bill-data/index.ts` | Add multi-item splitting instructions to AI prompt |
| `src/components/bills/EditExtractedBillDialog.tsx` | Use `description` as memo fallback when loading lines |

