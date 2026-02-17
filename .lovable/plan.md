

## Fix: Disambiguate "This Bill" When Multiple PO Lines Share the Same Cost Code

### Problem
PO 2025-115E-0006 has two "4810: Decks" line items -- "Decks" ($2,232) and "Rear deck and roof" ($1,500). The $1,032 bill line matches both by cost code, so "This Bill" shows $1,032 on BOTH rows instead of just one.

This happens because the pending bill line has a `purchase_order_id` but no `purchase_order_line_id`, and the fallback matching in `getPendingForLine` uses only `cost_code_id` -- which is identical for both PO lines.

### Solution
Use the same memo-based keyword matching that the billing distribution code in `useVendorPurchaseOrders.ts` (lines 190-207) already uses. When multiple PO lines share the same cost code, compare the bill line's memo/description against each PO line's description to find the best match. This is the same proven approach the system already uses for allocated billing.

### Changes

**1. `src/components/bills/PODetailsDialog.tsx` -- Add `memo` to PendingBillLine and improve matching**

Add `memo?: string` to the `PendingBillLine` interface.

Update `getPendingForLine` to handle the case where multiple PO lines share the same cost code:
- First pass: match by `purchase_order_line_id` (already works, no change)
- Second pass (fallback): when matching by `cost_code_id`, check if there are multiple PO lines with the same cost code. If so, use keyword overlap between the bill line's `memo` and each PO line's `description` to pick the best match. Only allocate the amount to THIS specific PO line if it wins the keyword match.
- If no keyword winner, leave it unallocated (show dash) rather than double-counting

The logic mirrors the existing `memoMatchScore` approach in `useVendorPurchaseOrders.ts`.

**2. `src/components/bills/BillPOSummaryDialog.tsx` -- Pass `memo` through**

Update `derivedPendingBillLines` mapping (line 75-79) to include memo from the bill line. Update the `BillLine` interface to include `memo`.

**3. `src/components/bills/BatchBillReviewTable.tsx` -- Pass `memo` in bill_lines**

Update the bill_lines mapping (line 990-994) to include memo/description from the pending bill line so it flows through to the dialog.

### How Disambiguation Works

The `getPendingForLine` function receives the full list of PO line items. When a bill line falls back to cost code matching:

1. Collect all PO lines with the same cost_code_id
2. If only one match, allocate directly (current behavior, no change)
3. If multiple matches, score each by keyword overlap between bill memo and PO line description
4. Allocate only to the winning PO line

Example with the user's case:
- Bill line memo: "Decks" (or similar), cost_code 4810, $1,032
- PO line "Decks" ($2,232): keyword score = high (matches "deck")
- PO line "Rear deck and roof" ($1,500): keyword score = lower or equal
- Winner: "Decks" gets $1,032, "Rear deck and roof" shows dash

### Files Changed
- `src/components/bills/PODetailsDialog.tsx` (add memo to interface, improve getPendingForLine)
- `src/components/bills/BillPOSummaryDialog.tsx` (pass memo through derivedPendingBillLines)
- `src/components/bills/BatchBillReviewTable.tsx` (include memo in bill_lines mapping)

### What Stays the Same
- PO Summary table (correctly shows totals per PO)
- Billing distribution in `useVendorPurchaseOrders.ts` (already handles this for saved bills)
- The smart PO matching utility in `poLineMatching.ts` (used for initial PO assignment, not line-level)
- All other tabs and dialogs
