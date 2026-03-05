

## Add Accounting Manager Column to QuickBooks View

The "Accounting Manager" column currently only appears when the "Builder Suite" toggle is active (`!showQuickBooks`). The user wants it visible on both views, positioned between Address and Last Reconciliation.

### Change

**`src/components/accountant-dashboard/AccountantJobsTable.tsx`**

Remove the `{!showQuickBooks && ...}` conditional wrapping from both:
1. The `<TableHead>` for "Accounting Manager" (header row)
2. The `<TableCell>` for the accounting manager name (body row)

This makes the column always visible regardless of the Builder Suite / QuickBooks toggle. Also update the `colSpan` on the empty-state row to account for the extra column.

