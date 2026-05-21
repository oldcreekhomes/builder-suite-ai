# Fix: Bank register shows bill payments as uncleared even after reconciliation completed

## Root cause

When you complete a reconciliation, individual **bill payments** are marked reconciled on the **`journal_entry_lines`** row (see `useBankReconciliation.ts` `markTransactionReconciled`, type `'bill_payment'` → updates `journal_entry_lines.reconciled / reconciliation_id / reconciliation_date`).

But the **Account Detail dialog** (the "1010 - Atlantic Union Bank" register in your screenshot) reads the reconciled flag from the wrong place. In `src/components/accounting/AccountDetailDialog.tsx` line 743, for rows where `source_type = 'bill_payment'` it does:

```
reconciled = bill.reconciled || !!bill.reconciliation_id || !!bill.reconciliation_date;
```

That's the parent **bill's** reconciled flag — which is never set when an individual payment is reconciled. So every bill payment after the consolidated payments redesign shows as uncleared in the register, even though the March 31 reconciliation completed successfully.

This matches exactly what you're seeing:
- Reconciliation History: shows 03/31/2026 completed with $0 difference (correct — `bank_reconciliations.status='completed'` is real)
- Bank register: shows everything after Feb as uncleared (wrong — reads `bills.reconciled` instead of the JE line)

Consolidated bill payments (synthetic rows, line 817) already read from `bill_payments.reconciled` correctly. Checks, deposits, credit cards also work correctly. Only the per-bill `bill_payment` JE rows are broken.

## Fix

In `src/components/accounting/AccountDetailDialog.tsx` around lines 738–753, for `source_type === 'bill_payment'`, use the **journal_entry_line's** reconciled fields (already selected in the query at lines 144–146) instead of the bill's:

```
if (line.journal_entries.source_type === 'bill_payment') {
  // Per-payment reconciliation lives on the JE line (bank-account credit line)
  reconciled = line.reconciled || !!line.reconciliation_id || !!line.reconciliation_date;
  reconciliation_date = line.reconciliation_date;
} else if (line.journal_entries.source_type === 'bill') {
  // A/P entry — keep using bill-level flag
  reconciled = bill.reconciled || !!bill.reconciliation_id || !!bill.reconciliation_date;
  reconciliation_date = bill.reconciliation_date;
}
```

Vendor name / description / `accountDisplay` / `isPaid` logic stays the same (still pulled from the bill via `billsMap`).

No other files, no DB changes, no schema changes.

## Verification

After the fix, on 23-17 Street → Atlantic Union Bank register:
- All bill payments dated on/before 03/31/2026 should show the green check (cleared)
- Bill payments dated after 03/31/2026 remain uncleared
- Reconciliation History panel unchanged
- Consolidated bill payments, checks, deposits, manual JEs still display correctly
