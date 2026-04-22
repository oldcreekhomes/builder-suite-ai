
Fix the pending-bill line-item views so the hover tooltip, PO dialog, and Edit Extracted Bill all render from the same saved line rows and therefore always agree.

1. Make `pending_bill_lines` the single source of truth for pending AI bills
- For the Enter with AI / Review table, stop using `extracted_data.total_amount` as the displayed bill amount whenever `pending_bill_lines` exist.
- Compute the amount column from the saved line amounts, with `extracted_data.total_amount` only as a fallback when no line rows exist yet.
- Do the same for tooltip totals so the row amount, tooltip total, and editor total can never diverge.

2. Fix the hover tooltip so it includes every saved line
- Replace the current tooltip breakdown logic in `BatchBillReviewTable.tsx`, which only totals rows that have a visible `cost_code_name`/`account_name`.
- Include all saved lines in original order.
- For lines missing a visible label, show a deterministic fallback like `No Cost Code` / `No Account` instead of dropping the row.
- Use the same display formatter everywhere so framing lines show their code numbers when present and blank rows are still counted.

3. Fix the pending PO dialog to show the same saved lines, not a filtered subset
- In `BatchBillReviewTable.tsx`, pass full line metadata into `BillPOSummaryDialog`: `cost_code_display`, `po_assignment`, `po_reference`, and the normalized `purchase_order_id` sentinel handling used by matching.
- In `BillPOSummaryDialog.tsx`, remove the current “single PO = jump straight to PODetailsDialog” shortcut whenever the bill has any unmatched lines.
- Only use the direct single-PO detail view when every line truly resolves to that one PO.
- Otherwise render the summary table so unmatched lines 2/3/4 still appear as `No PO`.
- For each row, prefer the bill line’s saved `cost_code_display` over the PO header match label so the PO summary mirrors the editor exactly.

4. Fix initial pending-bill auto-matching so it doesn’t create silent contradictions
- Update the PO auto-match block in `BillsApprovalTabs.tsx` to honor explicit `po_assignment = 'none'` and skip rematching those rows.
- When it does auto-match, persist `po_assignment = 'auto'` alongside `purchase_order_id` / `purchase_order_line_id`.
- If a matched PO line provides the only known cost code, persist the inherited `cost_code_id` and formatted display label so the editor and tooltip don’t show blanks.
- This aligns the initial review-table state with the later editor logic instead of having two different auto-match behaviors.

5. Remove the editor fallback that collapses real multi-line bills into one synthetic line
- In `EditExtractedBillDialog.tsx`, delete the load-time “replace ALL lines with a single Amount Due line” fallback when saved line totals differ from `extracted_data.total_amount`.
- Keep the actual saved rows visible even when totals need review.
- If needed, add a warning banner that the extracted total and line sum disagree, but never destroy the detailed line breakdown the user can correct.

6. Harden extraction recovery for collapsed invoices like INV0022
- In `supabase/functions/extract-bill-data/index.ts`, keep the recovered multi-line split, but stop assigning a cost code only to the first recovered row.
- Run cost-code inference per recovered row so all four amounts (`10,268`, `400`, `400`, `500`) survive with row-level categorization.
- Add a validation pass: if multiple grounded amounts are found in source text, preserve them as separate `line_items`; if row math is suspicious, flag `needs_review` instead of collapsing the invoice.
- This prevents future extractions from recreating the “one PO line plus blank/partial editor lines” problem.

7. Repair the currently broken pending INV0022 record
- Create a migration to correct the current pending upload for this invoice so the preview matches immediately:
  - four saved rows
  - amounts `10,268 / 400 / 400 / 500`
  - correct cost codes on all four rows
  - only line 1 attached to the siding PO
  - lines 2–4 explicitly marked `No PO`
- If any stale auto-match rows exist on this pending upload, clear them and set `po_assignment` consistently.

Technical details
- Files to update:
  - `src/components/bills/BatchBillReviewTable.tsx`
  - `src/components/bills/BillPOSummaryDialog.tsx`
  - `src/components/bills/BillsApprovalTabs.tsx`
  - `src/components/bills/EditExtractedBillDialog.tsx`
  - `supabase/functions/extract-bill-data/index.ts`
  - new Supabase migration for the INV0022 repair
- Core rule for all pending-bill UI:
  - metadata source: `pending_bill_uploads.extracted_data`
  - line-item source: `pending_bill_lines`
  - never mix display totals from one source with line details from the other
- Matching rule:
  - `po_assignment = 'none'` always wins
  - `po_assignment = 'auto'` marks system suggestions
  - explicit saved line state must render identically in tooltip, PO summary, and editor

Verification
1. Hover the cost code cell: four rows appear, all amounts present, total = `$11,568.00`.
2. Open PO status: line 1 shows the siding PO; lines 2–4 remain visible as `No PO`.
3. Open Edit Extracted Bill: same four rows, same amounts, same cost codes, same PO assignments.
4. Re-extract another invoice in this format: it stays split into separate line items instead of collapsing to one synthetic total row.
