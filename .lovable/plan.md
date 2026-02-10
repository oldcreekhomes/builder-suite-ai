
# Fix: Accounts Payable Report Showing Wrong Total ($44,035.50)

## Problem

The A/P Aging report (under the Reports tab) shows $44,035.50 instead of the correct ~$20,486.15. It is including bills that have already been paid because it uses `bill_payment_allocations` to determine historical payments -- but that table only has 2 records out of 11 actual payments. Individual bill payments skip that table entirely.

This is the exact same bug we just fixed in the Account Detail Dialog.

## Solution

Replace the `bill_payment_allocations` query in `AccountsPayableContent.tsx` with a `journal_entries` query (same pattern as the dialog fix).

## Changes

### File: `src/components/reports/AccountsPayableContent.tsx` (lines 108-132)

Replace the `bill_payment_allocations` query (Step 2 and Step 3) with:

1. Query `journal_entries` joined with `journal_entry_lines` where `source_type = 'bill_payment'`, `source_id IN (billIds)`, `entry_date <= asOfDateStr`, `reversed_at IS NULL`, and `debit > 0`.
2. Sum the debit amounts per `source_id` (which is the bill ID) to get total paid per bill as of the report date.

```typescript
// Step 2: Query journal entries for bill payments made on or before the as-of date
const { data: paymentEntries, error: payError } = await supabase
  .from('journal_entries')
  .select('source_id, journal_entry_lines!inner(debit)')
  .eq('source_type', 'bill_payment')
  .in('source_id', billIds)
  .lte('entry_date', asOfDateStr)
  .is('reversed_at', null)
  .gt('journal_entry_lines.debit', 0);

// Step 3: Sum payments per bill
const paidAsOfDate: Record<string, number> = {};
(paymentEntries || []).forEach((entry: any) => {
  const billId = entry.source_id;
  const debit = entry.journal_entry_lines?.[0]?.debit || 0;
  paidAsOfDate[billId] = (paidAsOfDate[billId] || 0) + debit;
});
```

The rest of the logic (Step 4 - calculating open balance and filtering) remains unchanged since it already uses `paidAsOfDate` correctly.
