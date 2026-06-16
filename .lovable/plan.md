## Plan

1. **Fix the shared date cache invalidation**
   - Update the existing date-sync helper so it invalidates the real query keys used by both dashboards:
     - PM Accounting Alerts: `accounting-manager-bills`
     - Accountant dashboard project table: `projects`
     - Accountant bill counts: `bill-counts-by-project`
   - Remove/replace the stale `accountant-project-alerts` key, since the current accountant dashboard does not use it for the Active Jobs table.

2. **Make project date updates patch both dashboard caches immediately**
   - When `Invoices Approved`, `Invoices Paid`, `Closed Books`, or `Last Reconciliation` is updated, patch cached `projects` rows even when the query key includes the user id (`['projects', userId]`).
   - Patch `accounting-manager-bills.projectsWithCounts` for `qbInvoicesApprovedDate` so the PM dashboard updates instantly after editing from the Accountant dashboard.
   - Keep the existing PM dashboard constraints: no Paid column, only projects where the user is accounting manager, street-only display.

3. **Ensure Accountant dashboard reads the updated project date fields**
   - Confirm `useProjects()` returns the QuickBooks date fields from `projects` and is invalidated/refetched after date edits.
   - No UI expansion or new columns; this is only sync behavior.

4. **Preserve current filtering and layout**
   - Do not re-add the PM `Paid` column.
   - Do not remove the `.eq('accounting_manager', user.id)` filter in the PM Accounting Alerts hook.
   - Do not change the street-only address display in the PM Accounting Alerts card.

## Technical notes

The apparent mismatch is because the two dashboards use different React Query caches: PM reads `useAccountingManagerBills()`, while Accountant reads `useProjects()`. Updates save to the same database table, but the cache invalidation/patching needs to target both actual query families, including user-scoped project query keys.