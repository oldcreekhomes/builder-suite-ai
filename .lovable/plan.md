
Goal: stop relying on ambiguous cost-code fallback for this bill and make Enter with AI use the same explicit line-level PO linkage the other tabs use.

What I found
- Do I know what the issue is? Yes.
- For bill `C26019`, the DB still has all 3 `pending_bill_lines` with:
  - `purchase_order_id = null`
  - `purchase_order_line_id = null`
  - `memo = null`
- But the bill’s `extracted_data.line_items` clearly contains the strongest match signal:
  - `2025-923T-0035`
  - `PO2025-923T-0036`
  - `PO#2025-923T-0027`
- `BatchBillReviewTable` is not passing `po_reference` into the matching/dialog payload, so Enter with AI cannot use the printed PO numbers.
- After the previous fix, `BillPOSummaryDialog` now correctly refuses to guess when two matched POs share cost code `4400`. That’s why the two 4400 rows now show `$0.00` instead of being incorrectly combined.

Why this specific bill still fails
- The invoice is simple, but the exact PO references are trapped in `pending_bill_uploads.extracted_data`, not on the `pending_bill_lines` rows that the matching flow actually uses.
- So the dialog has:
  - the right 3 PO candidates
  - the right cost codes
  - the right PO totals
  - but not the explicit line-to-PO linkage needed to allocate the two `4400` lines separately.

Implementation plan
1. Propagate printed PO references into the Enter with AI matching payload
- In `BatchBillReviewTable.tsx`, include `po_reference` (and description fallback) in:
  - `billsForMatching`
  - `buildDialogBill().bill_lines`
- Use the pending line value first, then fall back to `bill.extracted_data.line_items` by line order when the row field is blank.

2. Make the matcher consume that signal
- In `useBillPOMatching.ts`, extend the local `BillLine` shape if needed and keep `po_reference` flowing through the same matcher path.
- This lets Enter with AI resolve:
  - `PO#2025-923T-0027` -> 0027
  - `PO2025-923T-0036` -> 0036
  before any cost-code fallback is attempted.

3. Persist the explicit linkage for this queue, not just the temporary dialog
- In `BillsApprovalTabs.tsx`, after lines are loaded/refetched, auto-match using:
  - `line.po_reference`
  - else extracted line-item `po_reference`
  - else description/memo + amount scoring
- Persist both:
  - `purchase_order_id`
  - `purchase_order_line_id`
- Also ensure this auto-match still runs after the lot-assignment/refetch path, so it does not get skipped.

4. Backfill existing extracted bills already in queue
- In the pending-bill load path (`BillsApprovalTabs.tsx` and/or `EditExtractedBillDialog.tsx`), hydrate missing per-line fields from `extracted_data.line_items`:
  - `po_reference`
  - description/memo fallback
- This fixes the current bill immediately without requiring re-extraction.

5. Keep the dialog allocation logic strict
- Leave the `BillPOSummaryDialog.tsx` shared-cost-code guard in place.
- Once the explicit line ids/PO refs are present, the dialog should naturally show:
  - `2025-923T-0035` -> `$20,350.00`
  - `2025-923T-0036` -> `$2,800.00`
  - `2025-923T-0027` -> `$4,030.00`

Files to update
- `src/components/bills/BatchBillReviewTable.tsx`
- `src/hooks/useBillPOMatching.ts`
- `src/components/bills/BillsApprovalTabs.tsx`
- `src/components/bills/EditExtractedBillDialog.tsx`
- Possibly the extraction writer path that creates `pending_bill_lines`, so `po_reference` is saved correctly going forward

Technical notes
- This is no longer a UI problem.
- It is a missing-data propagation problem:
  - invoice line knows the PO number
  - extracted JSON knows the PO number
  - pending line row does not
  - dialog therefore cannot split the two `4400` lines safely
- No new schema is required; the columns already exist.

Verification
- Open bill `C26019` in Enter with AI
- PO Status Summary must show:
  - `2025-923T-0027` -> This Bill `$4,030.00`
  - `2025-923T-0035` -> This Bill `$20,350.00`
  - `2025-923T-0036` -> This Bill `$2,800.00`
- Total “This Bill” must equal `$27,180.00`
- Refresh and reopen the bill: same result
- Open Edit Extracted Bill: the same PO assignments should already be attached at line level
