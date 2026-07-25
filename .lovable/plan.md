## Problems

**1. "Last Reconciliation" column is blank on the Builder Suite tab** for Woodstock, Custis, and Princess — even though all three have completed reconciliations (Jun 30, May 31, Jun 30 respectively against **Capital One**).

Root cause confirmed in DB: `src/hooks/useLatestBankReconciliationsByProject.ts` hardcodes a Sandy Spring Bank account id and filters reconciliations to that bank only. Every project reconciled against Capital One (or any other bank) gets dropped and shows "–".

**2. "Closed Books" cell on the Builder Suite tab is not interactive.** On the QuickBooks tab that cell opens a calendar popover; on the Builder Suite tab it's plain text, so clicking it does nothing to prevent row-click, and the row's `onClick` navigates to the project — which is what you're seeing as "the dash links to the project."

The "Last Reconciliation" cell on the Builder Suite tab has the same non-interactive problem — but reconciliation dates should stay read-only (they're derived from actual completed reconciliations). Only Closed Books needs to become clickable, since that maps to the existing `accounting_periods` close-period flow.

## Fix

### 1. Show the true latest reconciliation regardless of bank
Rewrite `useLatestBankReconciliationsByProject` to drop the hardcoded `bank_account_id` filter — return each project's most recent `completed` reconciliation across all bank accounts. No UI change needed; the Builder Suite branch of the Last Reconciliation cell already reads from this hook, so Woodstock/Custis/Princess will populate immediately.

### 2. Make Closed Books clickable on the Builder Suite tab
In `src/components/accountant-dashboard/AccountantJobsTable.tsx`, replace the plain-text Builder Suite branch of the Closed Books cell (currently just `closedPeriods[project.id]?.period_end_date` text) with the same Popover + Calendar pattern already used on the QuickBooks side, but wired to the real Builder Suite mechanism:

- Selected value: `closedPeriods[project.id]?.period_end_date`.
- On date select: call `useAccountingPeriods().closePeriod({ projectId, periodEndDate })` (already imports the exact validation + auto-close-earlier-periods logic used on the Close Books page).
- On error (e.g. `can_close_period` rejects because reconciliations aren't complete), the existing hook's toast surfaces the reason — no extra handling needed.
- Wrap the trigger `<button>` with `onClick={(e) => e.stopPropagation()}` so it no longer falls through to the row-navigation handler (this is why clicking the dash currently opens the project).
- Prevent stray row navigation on the Last Reconciliation Builder Suite cell too by wrapping its text in a `<span onClick={stopPropagation}>` — read-only, but stops the "opens project" side effect if you click it.

Because `useAccountingPeriods` scopes its query by `projectId`, invoke a small per-row mutation via the same hook (call `useAccountingPeriods(project.id)` inside a new tiny child component `BuilderSuiteClosedBooksCell` to keep hook rules valid). On success it invalidates `['accounting-periods']`, which refreshes `useLatestClosedPeriodsByProject`'s data on next fetch — also invalidate that query key inside the cell's `onSuccess` so the cell updates without a manual refresh.

### 3. No other changes
Leave the QuickBooks tab, the Close Books page, and all other columns untouched.

## Files touched
- `src/hooks/useLatestBankReconciliationsByProject.ts` — remove Sandy Spring hardcode.
- `src/components/accountant-dashboard/AccountantJobsTable.tsx` — add `BuilderSuiteClosedBooksCell` popover; stopPropagation on Last Reconciliation cell.

## Verification
- Reload Accountant dashboard → Builder Suite tab: Woodstock shows Jun 30 2026, Princess shows Jun 30 2026, Custis shows May 31 2026 in Last Reconciliation.
- Click the "–" under Closed Books for Woodstock → calendar opens (no navigation). Pick a date → toast confirms, cell updates to that date without refresh. If reconciliations aren't complete through that date, error toast explains why.
