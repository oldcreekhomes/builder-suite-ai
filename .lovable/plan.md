# Make Credit Cards work like Checks and Deposits

## What's wrong
1. **Forward arrow:** It's turned off on the newest entry. Checks and Deposits use it to go to the next newer entry, or to a blank new one when you're already on the newest.
2. **Credit Card Account blank / 3. Account blank:** Both accounts on the Stitch Fix entry (2150.05 CC: US Bank - 7423 and 8270) belong to 228 S Washington only. Credit Cards only looks up company-wide accounts, so it can't find job accounts and leaves the boxes empty. Checks and Deposits already look up both kinds.
4. **Date:** The entry shows 11/03 but was saved as 11/04. Opening a saved entry moves the date back a day; Deposits already avoids this.

## Fix (copying Checks/Deposits)
- Forward arrow: works on any saved entry. On the newest, it opens a blank new entry. Back arrow unchanged.
- Look up both company-wide and job accounts, the same way Write Checks does, so the Credit Card Account and line accounts fill in. Account names use the job's renamed labels, like Checks.
- If an account still isn't found, fetch it directly as Deposits does.
- Open saved dates as the local day, so 11/04 shows as 11/04.
- Check on screen at 228 S Washington: the back arrow opens Stitch Fix with both accounts and 11/04 showing, and the forward arrow opens a new blank entry.

## Technical details
- `CreditCardsContent.tsx`: forward `disabled={currentIndex === -1}`; `goToNext` already calls `createNewTransaction()` at index 0.
- Add the `project-scoped-accounts` query + `allAccounts` merge + `labelForAccount`/`useProjectAccountNames` from `WriteChecksContent.tsx`; use `allAccounts` in `navigateToTransaction` and the save-time text resolution, with a fallback to `line.accounts`.
- `setTransactionDate(toDateLocal(card.transaction_date))` (same helper Deposits uses).
