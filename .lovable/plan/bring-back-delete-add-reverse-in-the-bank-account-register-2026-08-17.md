# Bring back Delete / add Reverse in the Bank Account register

## What's happening

In the account register (Account Detail dialog), the row actions menu is built per row type. For rows of type **Bill Pmt - Check** (consolidated bill payments — every row in your screenshot), the Delete action is explicitly hidden and only "Edit Description" is offered. So there is no way to undo those payments from the register.

Rows for checks, deposits, credit cards, manual journal entries and bills still show Edit/Delete; a red lock replaces the menu when the row is reconciled or falls in a closed period.

## What to build

Add a **Reverse Payment** action to the actions menu for Bill Pmt - Check rows (proper accounting: no hard delete, a reversing entry is created).

Behavior:
- Menu for a consolidated bill payment row becomes: Edit Description, Reverse Payment (destructive, with confirmation dialog explaining a reversing entry will be posted and the bills returned to unpaid/partially paid).
- Blocked, with the existing red-lock/toast treatment, when the row is reconciled or dated in a closed period.
- On success: reversing journal entries are posted, bill balances and statuses are restored, the payment disappears from the register (or shows as reversed), and the bills reappear in Manage Bills > Approved. Register, balance sheet, bills and reconciliation queries are invalidated so no refresh is needed.

## Technical notes

- `src/components/accounting/AccountDetailDialog.tsx`: consolidated rows are synthetic (`source_id` = `bill_payments.id`, `journal_entry_id` = `consolidated:<id>`), which is why the existing `reverse_bill_payment(journal_entry_id_param)` RPC can't be called on them. Add a `Reverse Payment` entry to `TableRowActions` for `source_type === 'consolidated_bill_payment'` and keep Delete hidden for that type.
- New database function `reverse_consolidated_bill_payment(bill_payment_id_param uuid)` (SECURITY DEFINER, tenant-checked on `owner_id`):
  - Refuses when the payment is reconciled or its `payment_date` falls in a closed period (`is_period_closed`).
  - Finds the payment's journal entries via `bill_payment_allocations` -> bills, matching `journal_entries.source_type='bill_payment'`, `source_id = bill_id`, `entry_date = payment_date`, and a line on `payment_account_id`, skipping entries already reversed.
  - Posts flipped reversing entries and marks originals reversed (same pattern as `reverse_bill_payment`), decrements `bills.amount_paid` by each allocation and recomputes `status`.
  - Marks the payment itself reversed by adding `reversed_at` / `reversed_by` columns to `bill_payments` so the register stops rendering the synthetic row.
- Register query builder filters out `bill_payments` rows with `reversed_at not null`; Manage Bills payment history likewise excludes reversed payments.
- Cent-precise math (`Math.round(x*100)/100`) for the balance restore.
