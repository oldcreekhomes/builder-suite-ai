# Fix: Beginning Balance blank on first reconciliation (John Marshall @ 2401 N Potomac)

## What's happening

Reconcile Accounts derives the Beginning Balance from the **last completed reconciliation for that bank account on that project**, and the field is always locked. Confirmed in the database: 2401 N Potomac has **no reconciliation records at all** for any account, so there is no prior ending balance to pull from — the field falls back to 0 and, because it is hard-disabled, you can't type the real opening figure from your John Marshall statement.

So this isn't the JE breaking anything; it's the first-ever reconciliation on this project having no place to enter an opening balance.

## The fix

1. When there is **no completed reconciliation** for the selected account on the current project, unlock the Beginning Balance field so it can be typed in (like QuickBooks' first reconciliation).
2. Persist that typed value on the in-progress reconciliation record so it survives refresh and is used in the balancing math (difference must still hit $0.00, cent-precise).
3. Once a reconciliation has been completed for that account/project, keep the field locked and derived from the prior period's ending balance — unchanged from today's behavior.
4. Placeholder/empty handling: show an empty field with a `0.00` placeholder rather than a hard `0`, so it is obvious it needs input.

## Technical notes

- `src/components/transactions/ReconcileAccountsContent.tsx`: the Beginning Balance `Input` (currently `disabled={true}`) becomes `disabled={!selectedBankAccountId || hasCompletedHistory || isReconciliationMode}`; add an `onChange` that sets state plus `beginningBalanceRef.current` and flags unsaved changes, matching the Ending Balance pattern.
- The auto-populate effect keeps writing the derived value when `reconciliationHistory[0]` exists; when it doesn't, it must stop force-resetting to `"0"` on refetch so user input isn't clobbered.
- Existing save paths already write `statement_beginning_balance` from `beginningBalanceRef`, so persistence needs no schema change.
- No changes to journal entries, ledgers, or reports.
