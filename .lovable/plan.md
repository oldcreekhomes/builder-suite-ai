## Goal
On the **Builder Suite** tab of the Accountant Dashboard only, make the "Last Reconciliation" and "Closed Books" columns fully read-only. Values change only when the user performs a real reconciliation or closes books from their proper tabs, and the dashboard updates automatically when those actions happen.

QuickBooks tab is untouched — its date pickers remain as they are today.

## Changes

**`src/components/accountant-dashboard/AccountantJobsTable.tsx`** — Builder Suite branch only

Closed Books cell (Builder Suite):
- Replace `BuilderSuiteClosedBooksCell` (Popover + Calendar + `closePeriod`) with plain text: formatted `closedPeriods[project.id]?.period_end_date`, or `-`.
- Remove the `BuilderSuiteClosedBooksCell` function.

Last Reconciliation cell (Builder Suite):
- Replace the current cell with plain text: formatted latest reconciliation date from `latestReconciliations[project.id]`, or `-`.
- If the Builder Suite branch currently uses a Popover/Calendar here, remove it along with any `updateReconciliationDate` call inside the Builder Suite branch.

Cleanup:
- Only remove imports (`Popover`, `Calendar`, `useAccountingPeriods`, etc.) if they are no longer referenced anywhere in the file — the QuickBooks branch still uses date pickers, so most imports likely stay.
- Do not touch `handleDateSelect`, the `field` union, or any QuickBooks-tab logic.

## Auto-update on real actions
- Closing books already invalidates `['latest-closed-periods']` → Builder Suite Closed Books column refreshes automatically. No change needed.
- For Last Reconciliation: confirm the reconciliation-completion mutation invalidates the query key used by `useLatestBankReconciliationsByProject`. If it doesn't, add that invalidation so a new reconciliation shows up on the dashboard immediately.

## Out of scope
- QuickBooks tab — no changes.
- Invoices Approved and Invoices Paid columns — remain editable on both tabs.
