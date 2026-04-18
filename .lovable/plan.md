
Goal: make Enter with AI use the exact same PO-dialog data path as the other tabs, so clicking the row shows the real 3 matched invoice lines instead of an empty “0 matched POs” shell.

What’s actually broken
- Enter with AI is not using the same matcher flow as Review/Approved/Paid.
- `BatchBillReviewTable.tsx` currently opens `BillPOSummaryDialog` from `usePendingBillPOStatus` + an ad-hoc `vendorPOs` filter, which only gives rough PO ids and can lose the actual match rows.
- It also builds `bill_lines` without reliably carrying `purchase_order_line_id`, so `PODetailsDialog` cannot show the exact invoice-to-PO-line allocation.
- In the AI/pending flow, auto-matching and save logic are persisting `purchase_order_id` but not consistently persisting `purchase_order_line_id`, so the dialog lacks the line-level linkage it needs.

Implementation plan

1. Reuse the same matcher as the other tabs
- In `src/components/bills/BatchBillReviewTable.tsx`, replace the current dialog data flow based on `usePendingBillPOStatus` / `useVendorPurchaseOrders` with the same `useBillPOMatching` pattern used in `BillsApprovalTable.tsx` and `PayBillsTable.tsx`.
- Drive:
  - row clickability
  - PO badge status
  - dialog `matches`
  from `useBillPOMatching`, not from `poStatusMap`.

2. Open the dialog with the actual bill payload
- Add the same `poDialogState` structure used on the other tabs:
  - `open`
  - `matches`
  - `bill`
- On row click / PO badge click, pass the current pending bill plus the exact `matches` from `useBillPOMatching` into `BillPOSummaryDialog`.

3. Preserve exact pending line linkage
- Extend the Enter with AI bill-line mapping so `bill.bill_lines` passed to `BillPOSummaryDialog` includes:
  - `purchase_order_id`
  - `purchase_order_line_id`
  - `cost_code_id`
  - `amount`
  - `memo`
- This lets `PODetailsDialog` populate the three specific invoice lines under the correct PO instead of showing an empty summary.

4. Persist `purchase_order_line_id` in the pending-bill flow
- In `src/components/bills/BillsApprovalTabs.tsx`:
  - during initial auto-match, store both `purchase_order_id` and `purchase_order_line_id` on matched pending lines
  - persist both fields back to `pending_bill_lines`
- In `src/components/bills/EditExtractedBillDialog.tsx`:
  - when auto-matching, persist `purchase_order_line_id` alongside `purchase_order_id`
  - when saving edited lines, write `purchase_order_line_id` for both inserts and updates
- This ensures the dialog still works after refresh and doesn’t lose the line-to-PO-line assignment.

5. Keep existing row UX
- Preserve the row click behavior already added in Enter with AI.
- Keep `stopPropagation()` on checkboxes, files, vendor actions, and row actions so only intended clicks open the PO dialog.

Files to change
- `src/components/bills/BatchBillReviewTable.tsx`
- `src/components/bills/BillsApprovalTabs.tsx`
- `src/components/bills/EditExtractedBillDialog.tsx`

Expected result
- On Enter with AI, clicking the matched AN EXTERIOR row opens the same PO dialog behavior as the other tabs.
- The dialog shows the actual three invoice line items tied to that PO/invoice, not “0 matched POs”.
- The line-level PO attachment survives refresh/edit because `purchase_order_line_id` is persisted.

Verification
- Enter with AI → click the matched row → dialog opens immediately
- For bill `C26019`, confirm the dialog shows the 3 line items for that PO/invoice
- Click the PO badge directly → same populated result
- Refresh the page and re-open the same row → still populated
- Spot-check one simple single-line AI bill to confirm the standard case still works
