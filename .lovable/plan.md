

## Fix PO Auto-Matching Race Condition + Confidence Display

### Root Cause

The auto-match effect at line 363 depends only on `[vendorPOs]`. But bill lines (`jobCostLines`) are loaded asynchronously in `loadBillData()`. The typical sequence is:

1. Dialog opens, `loadBillData()` starts fetching from DB
2. `useVendorPurchaseOrders` hook fetches PO data
3. `vendorPOs` arrives first, effect fires -- but `jobCostLines` is still empty, so `jobCostLines.length === 0` exits early
4. `loadBillData()` finishes, `setJobCostLines(...)` populates lines
5. Effect never re-runs because `jobCostLines` is not in the dependency array

The matching utility itself works fine -- it never gets a chance to run.

### Fix

**File: `src/components/bills/EditExtractedBillDialog.tsx`**

**Change 1: Add `jobCostLines` to the effect dependency array with a "ran once" guard**

Add a `useRef` flag (`hasAutoMatched`) to track whether auto-matching has already run. Add `jobCostLines` to the dependency array so the effect re-fires when lines load. The guard ensures it only runs once (so user edits to PO selections aren't overwritten).

```text
const hasAutoMatched = useRef(false);

// Reset on dialog open
useEffect(() => {
  if (open) hasAutoMatched.current = false;
}, [open]);

// Auto-match effect
useEffect(() => {
  if (hasAutoMatched.current) return;
  if (!vendorPOs || vendorPOs.length === 0 || jobCostLines.length === 0) return;
  hasAutoMatched.current = true;
  
  // ... existing matching logic ...
}, [vendorPOs, jobCostLines]);
```

This ensures the effect waits until BOTH vendorPOs AND jobCostLines are populated before running.

**Change 2: Also include the PO header-level cost code as a matching signal**

Currently PO lines are the candidates. But the screenshot shows POs like "2025-115E-0003 | 4470 - Siding" which is a **single-line PO** where the PO header cost code (4470 Siding) matches the bill line cost code (4470 Siding). The matching utility should also consider the PO header's cost code name (e.g., "Siding") as a keyword source for PO lines that lack their own description.

In the candidate building loop, when a PO line has no description, fall back to the PO header's cost code name:

```text
cost_code_name: line.cost_code?.name || po.cost_code?.name || null,
```

### Technical Details

| File | Change |
|------|--------|
| `src/components/bills/EditExtractedBillDialog.tsx` | Add `useRef` guard for auto-match, add `jobCostLines` to dependency array, improve PO line candidate building with header cost code fallback |

### Expected Result

When user opens Edit Extracted Bill for INV0021:
- Lines load with memos "Deck balance", "Siding draw", "Added wall around piles..."
- vendorPOs loads with PO lines including "Decks", "Siding", etc.
- Auto-match effect fires (both data sets ready)
- "Deck balance" matches PO line "Decks" with green confidence badge
- "Siding draw" matches PO "Siding" with green confidence badge
- "$720 framing" matches the closest PO line with confidence badge
