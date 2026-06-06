## Fix: Consolidated bill payment status — combine both reconciliation signals

### Problem
After the previous fix, some Bill Pmt - Check rows still show **Paid** instead of **Cleared** (e.g., 01/05 OCH $4,897.43; 01/07 OCH $14,172.45; 04/10 Homestead $40,747.71). DB shows these payments have `bill_payments.reconciled = true` with a `reconciliation_id` + `reconciliation_date`, but every per-bill bank-side `journal_entry_lines.reconciled` is `false` (the reconciliation system updated the `bill_payments` flag but not the underlying JE lines).

The new logic preferred the bank-line signal when any was found (`bankAnyKnown ? bankAllRecon : cpFlagRecon`), which incorrectly forced these to "Paid".

### Fix
Treat reconciliation as a union of both signals — a consolidated payment is **Cleared** when *either*:
- `bill_payments.reconciled` (or `reconciliation_id` / `reconciliation_date`) is set, **OR**
- Any bank-side `journal_entry_lines` for the payment's bills (on this account) is reconciled.

This handles both legacy directions of out-of-sync data:
- bp flag false, JE lines reconciled → cleared (earlier user report).
- bp flag true, JE lines not reconciled → cleared (this report).

### Scope
- File: `src/components/accounting/AccountDetailDialog.tsx` only.
- Only the `isReconciled` derivation inside the consolidated synthetic-row builder changes; no other files, no DB, no label or styling changes.

### Verification
Reopen `1010 - Atlantic Union Bank`. The previously-stuck "Paid" rows (01/05 OCH $4,897.43, 01/07 OCH $14,172.45, 04/10 Homestead $40,747.71) should now show **Cleared**. Truly-outstanding bill payments (no bp flag and no reconciled JE line) continue to show **Paid**.