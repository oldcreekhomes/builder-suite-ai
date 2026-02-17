

## Fix: Exclude Current Bill from "Billed to Date" in PO Details

### Problem
When a bill moves from Review (draft) to Approved, it's no longer filtered out by the `status !== 'draft'` check. So it appears in **both** "Billed to Date" and "This Bill" -- double-counting again.

The Enter with AI tab is unaffected because pending bills are still `draft`.

### Solution
Add an optional `excludeBillId` parameter to `useVendorPurchaseOrders`. When provided, bill lines belonging to that bill are excluded from the "Billed to Date" totals. This way the current bill only shows in the "This Bill" column.

### Changes

**1. `src/hooks/useVendorPurchaseOrders.ts`**
- Add optional `excludeBillId` parameter to the function signature
- Add it to the query key so caching works correctly
- Filter out bill lines where `bill_id === excludeBillId` in both the line-level and PO-level billing loops (after the existing draft filter)

**2. `src/components/bills/BillPOSummaryDialog.tsx`**
- Pass `bill?.id` as `excludeBillId` to `useVendorPurchaseOrders`

**3. `src/components/bills/PODetailsDialogWrapper.tsx`**
- Pass `poDialogState.bill?.id` as `excludeBillId` to `useVendorPurchaseOrders`

### Why This Is Safe
- The parameter is optional and defaults to undefined (no filtering), so all other callers (ManualBillEntry, VendorPOInfo, POSelectionDropdown, EditExtractedBillDialog, BatchBillReviewTable) are completely unaffected
- Only the two components that display "This Bill" alongside "Billed to Date" will pass the exclude parameter

