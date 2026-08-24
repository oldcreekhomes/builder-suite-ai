# Reconcile both Nob Hill bank accounts (Atlantic Union + Capital One)

## What's actually wrong

Both accounts are set up correctly at Nob Hill — confirmed in the database: 1010 Atlantic Union Bank and 1015 Capital One are both active, both bank subtype, neither excluded from this project.

The Account dropdown is not missing Atlantic Union — it is **disabled**. Nob Hill's default bank is Capital One (1015), which has an unfinished reconciliation dated 08/20/2026 with an ending balance entered. When the page loads that in-progress reconciliation, it enters "reconciliation mode", and reconciliation mode locks the Account picker and the Statement Date. So the page always opens on Capital One with no way to switch.

There is also a leftover unfinished reconciliation on Atlantic Union at Nob Hill dated 05/31/2026 with a beginning balance of 0.

## Fix 1 — let the user change accounts (code)

In Reconcile Accounts:

- Keep the Account picker enabled at all times. Switching accounts already resets ending balance, notes and checked rows, and exits reconciliation mode.
- Because a switch abandons in-progress work on screen, show a small confirmation ("You have a reconciliation in progress on this account. Switch accounts?") before switching while in reconciliation mode. The saved in-progress record stays intact, so returning to the account restores it.

Statement Date stays locked in reconciliation mode (unchanged).

## Fix 2 — Atlantic Union cutover balance (data only, no code)

For the QuickBooks-to-BuilderSuite cutover on 03/01/2026 at Nob Hill, account 1010 Atlantic Union Bank:

- Remove the stale 05/31/2026 unfinished reconciliation (beginning balance 0, never completed).
- Insert one completed "opening" reconciliation dated 02/28/2026 with beginning balance 0.00 and ending balance 28,208.67, no cleared transactions.

Result: the next Atlantic Union statement opens with a Beginning Balance of $28,208.67. This touches only the reconciliation seed — no journal entries, ledger rows or reports change.

## Technical detail

- `src/components/transactions/ReconcileAccountsContent.tsx`: drop `disabled={isReconciliationMode}` on the Account `Select` (line 1146) and gate the `onValueChange` behind a confirm dialog when `isReconciliationMode` is true.
- Data: delete `bank_reconciliations` id `9cbc178a-2bce-4ae6-b9fe-cdd1c0003d74`; insert a `completed` row for `bank_account_id = 27ed0c3a-be95-4367-aa21-1a2b51ea1585`, `project_id = 691271e6-...`, statement_date 2026-02-28, ending 28208.67.
