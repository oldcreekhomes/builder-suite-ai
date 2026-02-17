

## Add "This Bill" Column to PO Status Summary Dialog

### What Changes
Add a "This Bill" column (in green) between "Billed to Date" and "Remaining" in the PO Status Summary dialog, matching the pattern already used in the PODetailsDialog.

### How It Works
- The `BillPOSummaryDialog` already receives the `bill` object, which includes `bill_lines` with `cost_code_id` and `amount` per line
- Each `POMatch` has a `cost_code_id` -- we match bill lines to POs by cost code to compute per-PO "this bill" amounts
- The "Remaining" column will be recalculated as `PO Amount - Billed to Date - This Bill`

### Technical Details

**File: `src/components/bills/BillPOSummaryDialog.tsx`**

1. Expand the `bill` prop interface to include `bill_lines` (already available from the parent `BillsApprovalTable`)
2. For each PO match row, compute the "this bill" amount by summing `bill.bill_lines` where `cost_code_id` matches the PO's `cost_code_id`
3. Add a new `<TableHead>` for "This Bill" between "Billed to Date" and "Remaining"
4. Add a new `<TableCell>` showing the amount in green (`text-green-700 bg-green-100`) -- matching the PODetailsDialog style
5. Recalculate "Remaining" as `po_amount - total_billed - thisBillAmount` so the user sees the projected remaining after this bill

**File: `src/components/bills/BillsApprovalTable.tsx`**
- No changes needed -- the `bill` object passed to `BillPOSummaryDialog` already contains `bill_lines` from the query data

