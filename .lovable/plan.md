

## Fix Bill Total Amount Rounding Discrepancy

### Problem
The `approve_pending_bill` database function stores line amounts as raw `quantity * unit_cost` without cent-rounding. The Edit Bill dialog rounds each line (`Math.round(q * c * 100) / 100`) before summing, producing $98.53. The DB `total_amount` (sum of unrounded amounts) shows $98.56 in the table.

### Root Cause
Per the project's cent-precise rounding standard, every line contribution should be rounded to the nearest cent before aggregation. This isn't happening in the DB function.

### Fix (2 changes)

**1. Database migration — round amounts in `approve_pending_bill`**

Update the function so each line's `amount` is stored as `ROUND(amount, 2)` and `total_amt` is computed as `SUM(ROUND(amount, 2))`:

```sql
SELECT COALESCE(SUM(ROUND(amount, 2)), 0) INTO total_amt
FROM pending_bill_lines 
WHERE pending_upload_id = pending_upload_id_param
  AND amount IS NOT NULL AND amount != 0;
```

And in the line insert loop, use `ROUND(line_record.amount, 2)` for the `amount` column.

**2. Frontend fallback — `BillsApprovalTable.tsx`**

For existing bills already in the DB with unrounded totals, compute the displayed amount from bill_lines when available (matching how the Edit Bill dialog works):

In `renderBillRow`, replace `bill.total_amount` usage in the Amount cell with a helper that sums `Math.round(line.amount * 100) / 100` from `bill.bill_lines` when lines exist, falling back to `bill.total_amount` otherwise. This ensures the table and Edit Bill dialog always show the same number.

### Files modified
- New migration SQL (update `approve_pending_bill` function)
- `src/components/bills/BillsApprovalTable.tsx` (display fallback)

