## What’s actually going on

The 923 17th Street reconciliation history is real: the bank account has completed monthly reconciliations through 03/31/2026.

The problem is a data/model transition bug:

- Older reconciliations marked **bill payments** as reconciled on the parent `bills` row.
- The newer bank register logic now correctly expects bill-payment reconciliation to live on the exact `journal_entry_lines` bank-credit row.
- For 2025, those JE lines were never backfilled, so checks/deposits show cleared, but many **Bill Pmt - Check** rows show uncleared even though their parent bills have the old reconciliation markers.

Confirmed from the database for this project/account:

- Checks in 2025: reconciled correctly.
- Deposits in 2025: reconciled correctly.
- Bill-payment JE lines in 2025: **64 unreconciled lines** while the related bills carry the completed reconciliation IDs.
- This is why the dialog looks wrong while reconciliation history says complete.

The red lock icons are separate: books are closed through 01/31/2026 for this project, so those transactions are correctly read-only. Closed books do **not** mean the register’s cleared flag is correct; they are different columns/logic.

## Plan to fix

1. **Backfill legacy reconciled bill payments safely**
   - Add a one-time database migration that copies reconciliation data from legacy reconciled `bills` onto the matching bank-credit `journal_entry_lines` rows for `source_type = 'bill_payment'`.
   - Scope it to matching project/account payment lines only.
   - Only update lines that are currently missing reconciliation data.
   - Do not touch checks, deposits, manual journal entries, or already-correct JE lines.

2. **Make the bank register backward-compatible**
   - Keep the new per-payment JE-line source as the primary truth.
   - Add fallback logic only for legacy bill payments: if a `bill_payment` JE line has no reconciliation marker but the parent bill has one, display it as cleared.
   - This prevents old data from showing wrong if any legacy rows remain.

3. **Make reconciliation loading backward-compatible**
   - In `useBankReconciliation.ts`, when deciding whether a legacy bill payment is already reconciled, treat it as reconciled if either:
     - the JE line has a valid reconciliation ID, or
     - the parent bill has a valid reconciliation ID.
   - This prevents already-reconciled legacy bill payments from reappearing in future reconciliation screens.

4. **Invalidate the right cached register data after reconciliation changes**
   - After marking/undoing reconciliations, invalidate the account transaction/register query too, not just the reconciliation query.
   - That keeps the bank dialog and reconciliation screen in sync immediately.

5. **Verify with targeted DB checks**
   - Re-run counts for 923 17th Street / Atlantic Union Bank:
     - 2025 legacy bill-payment lines should no longer show as missing cleared status.
     - Completed reconciliation history remains unchanged.
     - Checks/deposits remain untouched.
   - Confirm closed-books lock display remains intact because it is working as intended.