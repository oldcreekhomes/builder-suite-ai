Root issue: both dashboards are reading the same project date columns, but they rely on separate React Query caches and the PM Accounting Alerts card only has an Approved column. The safest fix is to update the shared project cache immediately when a date is changed, then invalidate every affected query so both dashboards converge on the database value.

Plan:
1. Update `useUpdateProjectQBInvoiceDates.ts` so successful invoice date edits immediately patch all cached `projects` query results for the edited project, then refetch `projects`, `accounting-manager-bills`, `accountant-project-alerts`, and `bill-counts-by-project`.
2. Apply the same immediate cache-patch/refetch pattern to `useUpdateProjectQBReconciliationDate.ts` and `useUpdateProjectQBClosedBooksDate.ts` so all accountant dashboard date fields sync consistently.
3. Remove the extra one-off invalidation in `ProjectWarnings.tsx` because the mutation hook should be the single sync source.
4. Adjust `ProjectWarnings.tsx` to support the same invoice date fields shown on the Accountant dashboard, so Accounting Alerts can display and edit both Approved and Paid dates if needed instead of showing only one stale value path.
5. Verify by checking the updated files and confirming the cache keys and date columns are aligned across both dashboards.