
# Fix: Predecessor-to-Successor Bill Mapping in Hide Paid Filter

## Problem

The "Hide Paid" filter in the Account Detail Dialog shows $25,891.39, while the Balance Sheet (and Hide Paid OFF) correctly shows $23,833.43. The difference is $2,057.96 from 7 corrected bills whose vendor was changed during correction.

## Root Cause

The predecessor mapping code (added in the last fix) matches reversed bills to their corrected successors by `reference_number` AND `vendor_id`. However, when these 7 bills were corrected, the vendor was changed (e.g., from "The Home Depot" to "OCH at Nob Hill, LLC"). The reference numbers match ("11072025" = "11072025"), but the vendor IDs do not, so the mapping silently fails and the new bills are never marked as paid.

This works on 412/413 East Nelson because those projects have zero corrected bills.

## Fix

Replace the `reference_number` + `vendor_id` matching with a direct database-driven predecessor chain using the `reversed_by_id` column.

### File: `src/components/accounting/AccountDetailDialog.tsx`

**Replace** the entire predecessor mapping block (lines 379-408) with logic that:

1. Queries the `bills` table for all reversed bills in the project that have `reversed_by_id IS NOT NULL` and `is_reversal = false`
2. Builds a map: `old_bill_id` to `reversed_by_id` (the reversal bill)
3. For each old bill that was paid before the as-of date, finds the active corrected successor bill that shares the same `reference_number` (ignoring vendor, since it may have changed)
4. Marks those successor bills as paid in `billsPaidBeforeAsOf`

The key change is removing the `vendor_id` match requirement, since the vendor can change during correction. Within a single project, `reference_number` alone is sufficient to identify the correction chain when we already know one side is reversed and the other is active.

### Technical Implementation

```typescript
// Replace lines 379-408 with:
if (asOfDate && billsPaidBeforeAsOf.size > 0) {
  // Build a map of reference_number -> active bill IDs for bills NOT yet marked as paid
  const activeByRef = new Map<string, string[]>();
  billsMap.forEach((bill, billId) => {
    if (bill.status !== 'reversed' && !billsPaidBeforeAsOf.has(billId) && bill.reference_number) {
      const existing = activeByRef.get(bill.reference_number) || [];
      existing.push(billId);
      activeByRef.set(bill.reference_number, existing);
    }
  });

  // For each paid+reversed bill, find active successors by reference_number only
  // (vendor may have changed during correction)
  billsMap.forEach((bill, billId) => {
    if (billsPaidBeforeAsOf.has(billId) && bill.status === 'reversed' && bill.reference_number) {
      const successorIds = activeByRef.get(bill.reference_number) || [];
      successorIds.forEach(successorId => {
        billsPaidBeforeAsOf.add(successorId);
        const successorBill = billsMap.get(successorId);
        if (successorBill) {
          successorBill.isPaid = true;
        }
      });
    }
  });
}
```

## Why This Works

- The old bill (e.g., ref "11072025", vendor "The Home Depot", status "reversed") is in `billsPaidBeforeAsOf` because a payment JE references it
- The new corrected bill (ref "11072025", vendor "OCH at Nob Hill", status "paid") has the same reference_number
- By matching on `reference_number` only (within bills already scoped to the project), the successor is found and marked as paid
- Both sides are then hidden by the Hide Paid filter, maintaining the correct $23,833.43 total

## Files to Edit

| File | Change |
|---|---|
| `src/components/accounting/AccountDetailDialog.tsx` | Replace predecessor mapping block (lines 379-408) to match by `reference_number` only instead of `reference_number` + `vendor_id` |
