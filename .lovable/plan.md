
## Fix PO Status to Use Actual Line Data

### Problem
The PO status badge checks `bill.extracted_data?.line_items` for `purchase_order_id`, but PO assignments are stored in the `pending_bill_lines` table and accessed via `bill.lines` -- not in `extracted_data`. So the check always fails and shows "No PO."

### Fix (File: `src/components/bills/BatchBillReviewTable.tsx`)

**Line ~858-862**: Replace the data source from `bill.extracted_data?.line_items` to `bill.lines`:

```
Current (broken):
bill.extracted_data?.line_items?.some(line => line.purchase_order_id)

Fixed:
bill.lines?.some(line => line.purchase_order_id)
```

Also add smarter status logic:
- **All lines have a PO**: `'matched'`
- **Some lines have a PO, some don't**: `'partial'`
- **No lines have a PO**: `'no_po'`

This uses `bill.lines` which is already populated from the `pending_bill_lines` table and contains the actual `purchase_order_id` values set via the EditExtractedBillDialog.
