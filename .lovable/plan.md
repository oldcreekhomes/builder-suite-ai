
Fix the reconciliation bill-payment edit flow so the Con App date changes actually save and the table updates immediately.

Problem
- Those Con App rows are bill-payment rows in the reconciliation grid, not normal checks.
- In `src/hooks/useBankReconciliation.ts`, legacy bill-payment rows are built with `journal_entry_lines.id` as the row ID.
- But the edit mutation currently tries to update `journal_entries` using `.eq('source_id', id)`. `source_id` holds the bill ID, not the journal-entry-line ID, so the update matches 0 rows, returns “success,” and nothing changes.
- Consolidated bill payments have a second version of the same bug: their displayed date comes from `bill_payments.payment_date`, but the mutation still tries to update `journal_entries.entry_date`.

Implementation
1. Update `updateBillPaymentTransaction` in `src/hooks/useBankReconciliation.ts` to accept the transaction `type`.
2. Split the save logic by type:
   - `bill_payment`: resolve the parent `journal_entry_id` from the selected `journal_entry_lines.id`, then update that `journal_entries.entry_date`.
   - `consolidated_bill_payment`: update `bill_payments.payment_date` directly.
3. Fix the same ID-mapping problem for other editable bill-payment fields in that mutation while touching it:
   - legacy amount/reference lookup should use the correct parent records
   - consolidated amount/reference should write to `bill_payments`
4. Make the mutation fail loudly if no matching record is found/updated so the app never shows a false success toast again.
5. Update the callers in:
   - `src/components/transactions/ReconcileAccountsContent.tsx`
   - `src/pages/BankReconciliation.tsx`
   so they pass `type` into the mutation.
6. After a successful save, immediately patch the `reconciliation-transactions` cache and then invalidate it, so the edited date changes in the grid right away without needing refresh.

Technical details
- Reconciliation row IDs are different by transaction type:
  - check → `checks.id`
  - deposit → `deposits.id`
  - legacy bill payment → `journal_entry_lines.id`
  - consolidated bill payment → `bill_payments.id`
- The date field is also different:
  - legacy bill payment → `journal_entries.entry_date`
  - consolidated bill payment → `bill_payments.payment_date`

Verification
- In 923 17th Street reconciliation, update:
  - Con App $15,000 to 03/31
  - Con App $6,965 to 03/30
- Confirm each row updates immediately after save, stays correct after refresh, and no “success” toast appears unless the database row was actually updated.
