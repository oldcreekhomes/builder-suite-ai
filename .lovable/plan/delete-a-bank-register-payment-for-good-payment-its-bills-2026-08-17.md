# Delete a bank-register payment for good (payment + its bills)

## Problem
Deleting a "Bill Pmt - Check" row in the bank register currently posts a reversing entry and sends the bills back to the Approved tab. That is not what Delete should do — the payment and its bills reappear in Manage Bills.

## What Delete will do instead
When you delete a consolidated payment row in the bank register:
1. Remove the payment's journal entries (both the original and any reversal), so the bank balance corrects itself.
2. Remove the payment allocations and the payment record itself.
3. Permanently delete every bill that was paid by that payment, using the same hard-delete path the Manage Bills delete uses (`delete_bill_with_journal_entries`), so the bills do not come back in Approved, Review, or Paid — and their reference numbers are freed for reuse.

Guards that stay in place:
- Blocked if the payment is reconciled (undo the reconciliation first).
- Blocked if the payment date falls in a closed accounting period.
- Only available to users with delete-bill permission.

## Confirmation copy
"This payment and the bills it paid will be permanently deleted from the application. This cannot be undone. Continue?"

## Technical notes
- Replace the current `reverse_consolidated_bill_payment` call with a new database function (e.g. `delete_consolidated_bill_payment`) that, in one transaction: collects the bill IDs from `bill_payment_allocations`, deletes payment journal entries/lines, deletes allocations and the `bill_payments` row, then calls the existing `delete_bill_with_journal_entries` for each bill. It keeps the reconciled and closed-period checks and raises a clear error message when either blocks the delete.
- Update `src/components/accounting/AccountDetailDialog.tsx` to call the new function and invalidate bills, register, balance-sheet, reconciliation, and bill-count queries so both the register and Manage Bills refresh immediately.
