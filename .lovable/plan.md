# Reconcile Accounts: always show every bank account

## What's actually wrong

Both Nob Hill accounts are set up correctly — confirmed in the database: 1010 Atlantic Union Bank and 1015 Capital One are both active, both bank subtype, neither excluded from this project.

The Account dropdown is not missing Atlantic Union — it is **disabled**. Nob Hill's default bank is Capital One (1015), which has an unfinished reconciliation dated 08/20/2026 with an ending balance entered. On load the page restores that in-progress reconciliation and enters "reconciliation mode", which locks the Account picker. So the page always opens on Capital One with no way to switch to any other bank account.

## The fix

In Reconcile Accounts:

- The Account picker is always enabled and always lists every reconcilable account for the project — one if there's one, three if there are three. Whatever bank/credit-card accounts are checked for the project all appear.
- Because switching abandons the on-screen work, show a short confirmation when a reconciliation is in progress ("You have a reconciliation in progress on this account. Switch accounts?"). The saved in-progress record is untouched, so coming back to that account restores exactly where it left off.

Statement Date stays locked during reconciliation mode (unchanged).

## Not in this step

The Atlantic Union $28,208.67 opening balance for the 03/01/2026 QuickBooks cutover is a separate data entry — we'll handle it after this fix is in.

## Technical detail

- `src/components/transactions/ReconcileAccountsContent.tsx`: remove `disabled={isReconciliationMode}` from the Account `Select` (line 1146), and route `onValueChange` through a confirm dialog when `isReconciliationMode` is true before applying the existing reset (clears ending balance, notes, checked rows, exits reconciliation mode).
- The account list filter itself (active, not excluded, subtype bank/credit_card) is already correct and stays as is.
