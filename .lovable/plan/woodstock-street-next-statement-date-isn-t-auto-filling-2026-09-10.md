# Woodstock Street: next statement date isn't auto-filling

## What's actually wrong

Confirmed in the database: this account has 5 completed reconciliations and no unfinished one. The most recent is 07/31/2026 ending at $391.03, so the next Statement Date should come up as 08/31/2026.

The Reconcile Accounts screen sets the beginning balance and the statement date in the same one-time startup step, and that step waits for only one of the two things it needs. When the reconciliation history hasn't arrived yet, the step runs early, sees "no history", marks itself as already done, and never sets a date. When the history arrives a moment later, the screen still refreshes the beginning balance (which is why $391.03 shows) but the date stays empty — and since the date box is read-only by design, there's no way to type it in. It's a timing race, which is why it worked before and works some of the time.

## The fix

- Hold off the startup step until both the reconciliation history and the in-progress check have finished loading, so it never runs on empty data.
- Add a safety net: if there's a last completed reconciliation and no statement date is set, fill in the end of the following month. This covers any future timing hiccup.
- Statement Date stays read-only, exactly as it is today.

Result on Woodstock Street: opening Reconcile Accounts shows Beginning Balance $391.03 and Statement Date 08/31/2026 without touching anything.

## Technical detail

`src/components/transactions/ReconcileAccountsContent.tsx`, the auto-populate effect at ~line 985:

- Early-return while `historyLoading` is true (currently only `isLoadingInProgress` is checked), and add `historyLoading` to the dependency array.
- In the `hasLoadedFromDatabase` branch (line 1014), besides refreshing `beginningBalance`, also set `statementDate`/`hideTransactionsAfterDate` to `endOfMonth(addMonths(lastCompletedLocal, 1))` when `statementDate` is undefined and there is no in-progress record.
- No database or reconciliation-record changes.
