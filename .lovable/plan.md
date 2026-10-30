# Bill Issues: remove reversed bills, refresh on save

## Which one is correct?
**Oceanwatch is correct: it has no open bills.** The Carter Lumber bill (#53500053280, $7,007.20, marked "Paid" by Jole on 12/18/2025) was **reversed**, which cancels it out of the books. Manage Bills hides reversed bills. Bill Issues hides the reversing entry but still counts the original bill it cancelled, so it shows a "319 days late" bill that no longer exists.

## Fix 1: hide reversed bills
- Bill Issues and the Late/Rejected counts on Active Jobs both leave out any bill that has been reversed.
- Other jobs whose counts include reversed bills will drop to their correct numbers too.

## Fix 2: update on save
- Whenever a bill is saved, approved, rejected, paid, archived, reversed or deleted, Bill Issues and the Active Jobs Late/Rejected counts refresh right away. No page refresh needed.
- These tables also re-check each time you open the tab.

## Technical details
- `src/lib/billIssues.ts`: `isCountableBill` also returns false when `reversed_by_id` is set. Add `reversed_by_id` to the selects in `AccountantBillIssuesTable.tsx` and `useBillCountsByProject.ts`. Add a test in `billIssues.test.ts`.
- Invalidate `bill-issues-by-project` and `bill-counts-by-project` alongside every existing `['bills']` invalidation in `useBills.ts` (and other bill mutation hooks found via rg). Set `refetchOnMount: 'always'` on both queries.
