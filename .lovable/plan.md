## Goal

On the Project Manager dashboard, extend the **Accounting Alerts** card so it lists every active project and shows an **Invoices Approved** date column (with a date picker) to the right of the Late column. Editing the date writes to the same `projects.qb_invoices_approved_date` column used on the Accountant dashboard, so both views stay in sync automatically.

> Note: you asked for "Invoices Paid date only" editable but also said "just add the Approved column with a date picker." I'm going with the literal layout answer — one new **Invoices Approved** column, editable via date picker. If you'd rather it be the Paid column (or both), tell me and I'll swap.

## Changes

### 1. Data source (`src/hooks/useAccountingManagerBills.ts`)
- Extend the existing query so each project row also returns `qb_invoices_approved_date`.
- Return every active project (not just those with current/late bills) so the card lists them all. Active = status not in `Completed`, `Template`, `Permanently Closed`.

### 2. UI (`src/components/ProjectWarnings.tsx`)
- Render every active project row (drop the `project.totalCount > 0` filter).
- Add a third header column "Approved" to the right of Late.
- In each row, add a Popover + Calendar date picker (shadcn pattern, `pointer-events-auto`) bound to `qb_invoices_approved_date`. Empty state shows "—".
- Clicking the date picker must `stopPropagation` so the row-level navigate to project doesn't fire.

### 3. Mutation
- Reuse the existing `useUpdateProjectQBInvoiceDates` hook with `field: 'invoices_approved'`. It already invalidates `['projects']`; we'll also invalidate the accounting-manager-bills query key so the card refreshes immediately.

### 4. Sync with Accountant dashboard
- Both dashboards already read/write `projects.qb_invoices_approved_date`. By using the same mutation and invalidating the shared `['projects']` cache key, edits from either view are reflected on the other.

## Out of scope
- No schema changes (column already exists).
- No changes to per-project `ProjectAccountingAlerts` card.
- Reorder, sorting, and other PM dashboard cards untouched.
