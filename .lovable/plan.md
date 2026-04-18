
Goal: make the PO dialog use the same line-level signals the hover already proves are correct, so bill C26019 shows:
- 2025-923T-0035 → $20,350.00
- 2025-923T-0036 → $2,800.00
- 2025-923T-0027 → $4,030.00

What’s actually wrong
- The hover tooltip is just showing the extracted bill lines in order, which already contain the right three amounts.
- The PO dialog re-allocates those lines again and currently trusts only:
  1. purchase_order_line_id
  2. purchase_order_id
  3. unique cost-code fallback
- For this bill, the two 4400 lines are ambiguous by cost code, so the dialog drops them to $0 instead of using the printed PO references already present in extracted data.

Key proof from current data
- `pending_bill_uploads.extracted_data.line_items` for bill `C26019` already has:
  - `2025-923T-0035` / 20350 / Siding
  - `2025-923T-0036` / 2800 / Exterior Trim / Cornice
  - `2025-923T-0027` / 4030 / Cornice
- So this is not an OCR problem. It is a dialog-allocation problem.

Implementation
1. Make the dialog resolve lines by printed PO number before falling back
- In `src/components/bills/BillPOSummaryDialog.tsx`, update the line allocation order to:
  1. `purchase_order_line_id`
  2. explicit `purchase_order_id`
  3. normalized `po_reference` matched against PO number
  4. memo/description disambiguation
  5. unique cost-code fallback only
- Apply the same logic in:
  - `getThisBillAmount`
  - single-PO early return
  - bottom `pendingBillLines` filter

2. Make PO details use the exact same resolution rules
- In `src/components/bills/PODetailsDialog.tsx`, extend pending line handling so it can use:
  - `purchase_order_id`
  - `po_reference`
  - memo/description
- Update `getPendingForLine(...)` so ambiguous shared cost codes are resolved by printed PO number and then keyword match, not just raw cost code.

3. Pass the needed fields into the dialog
- In `src/components/bills/BatchBillReviewTable.tsx`, ensure `buildDialogBill()` passes:
  - `po_reference`
  - `memo`
  - extracted description fallback
  - `purchase_order_id`
  - `purchase_order_line_id`
- This keeps the dialog payload aligned with what the hover is already showing.

4. Persist/backfill exact matching for Enter with AI
- In `src/components/bills/BillsApprovalTabs.tsx`, keep auto-match centered on printed PO reference first, then line selection.
- Fix the billed lookup bug so it uses actual `poLineIds` instead of PO ids when querying `bill_lines.purchase_order_line_id`.
- Persist whichever explicit match is found so refreshes keep the same result.

5. Keep edit flow in sync
- In `src/components/bills/EditExtractedBillDialog.tsx`, carry `po_reference` through load/save so editing this bill does not lose the exact 0036 / 0027 split.

Files to update
- `src/components/bills/BillPOSummaryDialog.tsx`
- `src/components/bills/PODetailsDialog.tsx`
- `src/components/bills/BatchBillReviewTable.tsx`
- `src/components/bills/BillsApprovalTabs.tsx`
- `src/components/bills/EditExtractedBillDialog.tsx`

Technical notes
- The current mismatch exists because two different views are using two different truths:
  - hover = extracted line items
  - dialog = persisted/recomputed PO linkage
- The fix is to make the dialog consume the same explicit line-level PO reference already available on this bill.
- No schema change is expected if `po_reference` already exists on pending lines; otherwise verify and handle in default mode without touching generated Supabase types.

Verification
- Hover still shows the same 3 lines and amounts.
- Open PO dialog for C26019:
  - 0027 shows $4,030.00
  - 0035 shows $20,350.00
  - 0036 shows $2,800.00
- Total “This Bill” = $27,180.00
- Click into each PO detail row and confirm the correct pending line appears under that PO.
- Refresh and reopen the bill; same result.
- Open Edit Extracted Bill and confirm the same PO assignments remain attached.
