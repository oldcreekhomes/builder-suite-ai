Fix the Actions column so Capital One bill payment rows behave the same as Atlantic Union rows when they are not reconciled and not in a closed period.

Plan:
1. Update `AccountDetailDialog.tsx` so the red lock appears only when the transaction date is in a closed accounting period or the transaction is actually reconciled. Remove `isConsolidated` as an automatic lock reason.
2. Make the Actions column show the normal row action menu for unreconciled, open-period consolidated bill payment rows instead of a lock.
3. Wire the consolidated bill payment action to the correct existing workflow:
   - Show an edit action that opens the related bill/payment workflow rather than falsely locking the row.
   - Do not change reconciliation status, closed-period logic, balances, or database data.
4. Update the project memory rule for Account Detail so future changes do not re-add `isConsolidated` as an automatic lock condition.
5. Verify the lock condition in the code matches the intended behavior: closed books/reconciled rows lock; unreconciled open-period rows show editable actions.