

## Fix "This Bill" Column Missing on First Load in PO Dialog

### Problem
When opening the PO details dialog from the "Enter with AI" tab immediately after extraction, the "This Bill" column is missing. It only appears after a page refresh because:

1. Freshly extracted bill lines don't have `purchase_order_id` set on them
2. The PO matching is auto-detected separately (via `usePendingBillPOStatus`) using vendor + cost code lookup, but that result is never written back onto the bill lines
3. In `BillPOSummaryDialog`, `derivedPendingBillLines` is filtered by `l.purchase_order_id === po_id` -- which returns nothing when `purchase_order_id` is undefined
4. Empty `pendingBillLines` means `hasPending = false`, so the "This Bill" column is hidden

### Fix

**File: `src/components/bills/BatchBillReviewTable.tsx`** (lines ~988-996)

When building the `bill_lines` object for the `BillPOSummaryDialog`, enrich each line by inferring `purchase_order_id` from the auto-matched PO data when it's not explicitly set:

- For each bill line that lacks `purchase_order_id`, look up the auto-matched POs (from `vendorPOs`) by matching the line's `cost_code_id` against PO line items' `cost_code_id`
- If a match is found among the `poDialogPoIds`, assign that PO's ID as `purchase_order_id`
- This ensures the filter in `BillPOSummaryDialog` finds the lines and shows the "This Bill" column on first load

The logic mirrors what already happens in `usePendingBillPOStatus` (vendor + cost code matching), just applied at the point where bill lines are passed to the dialog.

### Technical Detail

```text
Current flow (broken on first load):
  bill.lines[].purchase_order_id = undefined
  --> BillPOSummaryDialog filters by purchase_order_id
  --> empty result --> no "This Bill" column

Fixed flow:
  bill.lines[].purchase_order_id = inferred from vendorPOs cost_code match
  --> BillPOSummaryDialog filters by purchase_order_id
  --> finds lines --> "This Bill" column shows
```

### Files Changed
- `src/components/bills/BatchBillReviewTable.tsx` -- enrich bill_lines with inferred purchase_order_id when building the PO dialog payload

