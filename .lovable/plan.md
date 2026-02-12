
# Fix: Hide Paid Filter Discrepancy in Account Detail Dialog

## Problem

On 126 Longview Drive (as of 12/31/2025):
- Balance Sheet shows A/P = **$23,833.43** (correct)
- Account Detail Dialog with Hide Paid OFF = **$23,833.43** (correct, matches)
- Account Detail Dialog with Hide Paid ON = **$25,891.39** (wrong, +$2,057.96)

This works on 412/413 East Nelson because those projects have zero corrected bills.

## Root Cause

Seven bills on this project were corrected on 12/08/2025. When a bill is corrected:
1. The **old bill** gets reversed (its journal entry gets `reversed_by_id` set, excluding it from queries)
2. A **new corrected bill** is created with a new ID
3. The **old payment** journal entry (referencing the old bill ID) remains valid -- it has `reversed_by_id = NULL` on the JE and `reversed_at = 2026-01-21` (after the as-of date)

As of 12/31/2025:
- Old bill posting JEs: **excluded** (JE has `reversed_by_id` set)
- Old payment JEs: **included** (JE has `reversed_by_id = NULL`, `reversed_at > as-of date`)
- New bill posting JEs: **included** (normal active entries)
- New payment JEs: **excluded** (entry_date = 2026-01-05, after as-of date)

When Hide Paid is OFF, the old payment debits correctly offset the new bill credits, giving the right $23,833.43.

When Hide Paid is ON, the `isPaid` flag determines what to hide:
- Old payment lines: `isPaid = true` (payment JE found for old bill ID) -- **hidden**
- New bill lines: `isPaid = false` (no payment JE found for new bill ID before 12/31) -- **shown**

Result: the old payments (debits) are hidden but the new bills (credits) remain, inflating the total by $2,057.96.

## Fix

**File: `src/components/accounting/AccountDetailDialog.tsx` (lines 358-377)**

After building `billsPaidBeforeAsOf` and iterating `billsData`, add a predecessor-to-successor mapping step:

1. After `billsData` is populated, identify reversed bills that are marked as paid (in `billsPaidBeforeAsOf`)
2. For each reversed+paid bill, find the active (unreversed) bill with the same `reference_number` and `vendor_id`
3. Add that active bill's ID to `billsPaidBeforeAsOf`

This way, when the old bill was paid before the as-of date, the corrected replacement bill is also considered paid, and Hide Paid correctly hides both the new bill and the old payment.

```text
Before (current logic):
  billsPaidBeforeAsOf = { oldBillId }
  Old payment isPaid = true  -> hidden
  New bill isPaid = false    -> shown  (BUG: inflates total)

After (fixed logic):
  billsPaidBeforeAsOf = { oldBillId, newBillId }
  Old payment isPaid = true  -> hidden
  New bill isPaid = true     -> hidden  (correct: both sides hidden, net zero)
```

### Implementation Detail

After the `billsData?.forEach(...)` loop (around line 377), insert:

```typescript
// Map predecessor (reversed) paid bills to their successor (active) bills
// When a bill is corrected, the old bill gets reversed and a new one is created.
// If the old bill was paid before the as-of date, the new bill should also be
// considered paid for Hide Paid filtering purposes.
if (asOfDate && billsPaidBeforeAsOf.size > 0) {
  const paidReversedBills: Array<{ reference_number: string; vendor_id: string }> = [];
  billsMap.forEach((bill, billId) => {
    if (billsPaidBeforeAsOf.has(billId) && bill.status === 'reversed') {
      paidReversedBills.push({
        reference_number: bill.reference_number,
        vendor_id: bill.vendor_id,
      });
    }
  });

  // For each paid+reversed bill, find the active successor with the same ref+vendor
  if (paidReversedBills.length > 0) {
    billsMap.forEach((bill, billId) => {
      if (bill.status !== 'reversed' && !billsPaidBeforeAsOf.has(billId)) {
        const match = paidReversedBills.find(
          rb => rb.reference_number === bill.reference_number
            && rb.vendor_id === bill.vendor_id
        );
        if (match) {
          billsPaidBeforeAsOf.add(billId);
          // Update the isPaid flag in billsMap
          bill.isPaid = true;
        }
      }
    });
  }
}
```

## Why This Only Affects Projects with Corrected Bills

The predecessor payment issue only occurs when:
1. A bill was posted and paid
2. The bill was then corrected (creating a new bill with a new ID)
3. The report is viewed as-of a date between the correction and the re-payment

412/413 East Nelson has zero corrected bills, so this code path is never triggered there.

## Files to Edit

| File | Change |
|---|---|
| `src/components/accounting/AccountDetailDialog.tsx` | Add predecessor-to-successor payment mapping after `billsData` loop |

No changes needed to Balance Sheet or A/P Aging -- this fix is isolated to the Hide Paid logic in the Account Detail Dialog.
