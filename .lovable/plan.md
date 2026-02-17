
## Fix Backfill Damage + PO Status Badge on Extracted Bills

### What Went Wrong

The backfill migration from the last change had a critical JOIN bug. It matched `bill_lines` to `pending_bill_lines` using only `line_number` (e.g., 1, 2, 3) plus a loose owner check. Since `line_number` is not unique across bills, this caused a massive cross-join: **986 bill lines across 657 bills** were incorrectly assigned purchase order IDs, when only **5 pending_bill_lines** actually have PO assignments. This is why the PO details dialogs show "$200,104.04 Billed to Date" and "$48,089.52 Billed to Date" -- hundreds of unrelated bills are now erroneously linked to those POs.

### Two Issues to Fix

**Issue 1: Reverse the backfill damage (critical)**
- Run a new migration that clears all incorrectly assigned `purchase_order_id` values from `bill_lines`
- Then re-apply the backfill correctly, matching through the actual bill-to-pending-upload relationship (using `pending_bill_uploads.status = 'approved'` and tracing the bill via owner_id + vendor_id + bill creation timestamp proximity, or simply clearing all and only keeping what the function now correctly handles going forward)
- Safest approach: NULL out all `purchase_order_id` on `bill_lines` except for the specific bills that were approved from the 3 known pending uploads, then re-apply those correctly

**Issue 2: PO Status badge shows "No PO" on extracted bills table**
- The `BatchBillReviewTable` checks `line.purchase_order_id` on the `bill.lines` array (lines 858-867)
- The data comes from `pending_bill_lines` fetched in `BillsApprovalTabs.tsx`
- The `pending_bill_lines` query at line 96-100 uses `select('*, project_lots(...)')` which does include `purchase_order_id` from the table
- However, when the `EditExtractedBillDialog` saves PO assignments, the parent `batchBills` state may not get refreshed with the updated `purchase_order_id` values
- Need to ensure the `EditExtractedBillDialog` `onSave` callback propagates `purchase_order_id` changes back to the parent state, or that the parent re-fetches lines after the dialog closes

### Technical Changes

**1. New Database Migration** -- Fix the backfill damage
- `UPDATE bill_lines SET purchase_order_id = NULL` for all bill_lines that were incorrectly assigned (clear everything, then re-apply only the correct ones)
- Re-apply correct PO links for the 3 known approved pending uploads by matching `bill_lines` through `bills` table using the `pending_bill_uploads` relationship (matching on owner_id, vendor_id, and the bill created closest to the approval time)

**2. `src/components/bills/BatchBillReviewTable.tsx`** -- Fix PO status refresh
- After the `EditExtractedBillDialog` closes, re-fetch the pending_bill_lines for that bill to get updated `purchase_order_id` values
- Or: have the `EditExtractedBillDialog` pass back updated line data including `purchase_order_id` through the `onLinesUpdate` callback

**3. `src/components/bills/EditExtractedBillDialog.tsx`** -- Ensure PO IDs propagate on save
- When saving changes, ensure the `purchase_order_id` field is included in the data passed back to the parent component's state update
- Check the onSave/onClose flow to confirm line data with PO assignments gets reflected in the parent `batchBills` state

### Sequence
1. Migration first to fix the data corruption (highest priority -- this affects all billing reports)
2. Then fix the UI refresh so PO status badge updates after editing
