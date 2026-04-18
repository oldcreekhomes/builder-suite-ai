
## Goal
Make **Enter with AI** use the exact same PO-dialog flow as the other tabs, so clicking a matched row opens the same populated PO dialog with the real invoice-to-PO line allocations.

## What is actually different today
Enter with AI is still not following the working pattern from Review / Rejected / Approved / Paid:

- `BatchBillReviewTable.tsx` still drives clickability and dialog content from `usePendingBillPOStatus` plus an ad-hoc `useVendorPurchaseOrders` filter.
- The working tabs use `useBillPOMatching` to produce:
  - row clickability
  - PO badge status
  - exact `matches`
  - the full `bill` payload passed into `BillPOSummaryDialog`
- Enter with AI is also failing to carry/persist `purchase_order_line_id`, which is what `PODetailsDialog` uses to show the three specific invoice lines instead of a blank/summary-only shell.

## Implementation
### 1) Replace the Enter with AI dialog path with the same one used elsewhere
In `src/components/bills/BatchBillReviewTable.tsx`:
- remove the PO-dialog state based on `poDialogBillId`, `usePendingBillPOStatus`, and `useVendorPurchaseOrders`
- build `billsForMatching` from pending bills in the same shape the other tabs use
- call `useBillPOMatching(billsForMatching)`
- add `poDialogState = { open, matches, bill }`
- make row click and PO badge click call `setPoDialogState({ open: true, matches, bill })`

### 2) Pass the real pending bill lines into the dialog
Still in `BatchBillReviewTable.tsx`, when building `bill` for `BillPOSummaryDialog`, include line-level fields for every pending line:
- `purchase_order_id`
- `purchase_order_line_id`
- `cost_code_id`
- `amount`
- `memo`

That gives `BillPOSummaryDialog` / `PODetailsDialog` the same usable payload shape as the working tabs.

### 3) Persist `purchase_order_line_id` during AI auto-matching
In `src/components/bills/BillsApprovalTabs.tsx`:
- when initial PO auto-match finds a PO line candidate, store both:
  - `purchase_order_id`
  - `purchase_order_line_id`
- persist both fields back to `pending_bill_lines`
- fix the billed lookup query so it uses actual PO line ids, not PO ids, when calculating per-line remaining amounts

### 4) Persist `purchase_order_line_id` when editing extracted bills
In `src/components/bills/EditExtractedBillDialog.tsx`:
- when loading lines, keep `purchase_order_line_id`
- when auto-matching in the dialog, persist `purchase_order_line_id` together with `purchase_order_id`
- when saving edited lines, include `purchase_order_line_id` in both inserts and updates

### 5) Carry PO line linkage into approved bills
Database / function work:
- keep the new `pending_bill_lines.purchase_order_line_id` column
- update `approve_pending_bill(...)` so it copies `purchase_order_line_id` from `pending_bill_lines` into `bill_lines`

Without this, the dialog may work before approval but lose the exact line linkage after approval/refresh.

## Files to change
- `src/components/bills/BatchBillReviewTable.tsx`
- `src/components/bills/BillsApprovalTabs.tsx`
- `src/components/bills/EditExtractedBillDialog.tsx`
- `src/hooks/usePendingBills.ts`
- database function `approve_pending_bill(...)`

## Expected result
For the Enter with AI bill row:
- hand cursor + click opens the dialog immediately
- the PO summary/details are populated from the same matcher path as the other tabs
- the dialog shows the actual 3 invoice line items tied to that PO/invoice
- the linkage survives refresh, edit, and approval

## Technical notes
- Root cause is not UI styling; it is data-path mismatch.
- The other tabs work because they all use `useBillPOMatching` + `poDialogState`.
- Enter with AI still uses a lighter status hook that is only good for badge status, not for rich PO drill-down.
- `PODetailsDialog` specifically prefers `purchase_order_line_id` for exact allocation.

## Verification
- Enter with AI → click matched AN EXTERIOR row → dialog opens
- Dialog shows the 3 specific matched invoice lines for that PO
- Click PO badge → same populated result
- Refresh and reopen → still populated
- Approve the bill, open it from the other tabs, and confirm the same line-level linkage remains intact
