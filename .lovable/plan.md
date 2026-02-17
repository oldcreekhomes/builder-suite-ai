

## Fix: $0.00 Remaining Shows as Red "-$0.00" Instead of Green "$0.00"

### Problem
When a bill exactly matches the PO amount, floating-point arithmetic produces `-0.00` instead of `$0.00`. This causes:
- The remaining amount to display as "-$0.00" in red (destructive) instead of "$0.00" in green
- A false "This bill will put the PO over budget by $0.00" warning banner to appear
- Misleading visual signals that suggest a problem when the bill is a perfect match

### Solution
Round the `projectedRemaining` and `lineProjectedRemaining` values to the nearest cent to eliminate floating-point artifacts, and treat zero as a non-negative value (green, not red).

### Technical Details

**File: `src/components/bills/PODetailsDialog.tsx`**

1. After computing `projectedRemaining` (line 110), round it to 2 decimal places and normalize negative zero:
   ```typescript
   const projectedRemaining = Math.round((purchaseOrder.remaining - totalPending) * 100) / 100;
   ```

2. Inside the line items loop, do the same for `lineProjectedRemaining`:
   ```typescript
   const lineProjectedRemaining = Math.round((line.remaining - linePending) * 100) / 100;
   ```

3. The existing color logic already handles this correctly once the values are properly rounded -- `0 < 0` is false, so it won't get the destructive color; `0 > 0` is false, so it falls through to no special class (default text). We should update the zero case to explicitly show green since $0.00 remaining means "fully allocated, on budget":
   - Change `projectedRemaining > 0 ? "text-green-700" : ""` to `projectedRemaining >= 0 ? "text-green-700" : ""`
   - Apply the same change at all 4 locations where this pattern appears (summary row, line items, totals row)

4. The warning banner condition `projectedOverBudget` (line 111) will automatically stop firing since `0 < 0` is false after rounding.

This is a small fix -- about 6 lines changed in one file. No new dependencies or queries needed.

