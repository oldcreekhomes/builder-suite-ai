## Goal
Make the Accountant dashboard's Builder Suite (BS) tab show the same "Invoices Approved?" and "Invoices Paid?" date-picker columns that already exist on the QuickBooks (QB) tab, so the two tables are visually identical.

## Change
Single file: `src/components/accountant-dashboard/AccountantJobsTable.tsx`

Remove the `showQuickBooks &&` gating on the two columns (headers + cells) so they always render. Specifically:

1. **Headers (lines 298–303)** — drop the `showQuickBooks &&` wrappers around the `<TableHead>Invoices Approved?</TableHead>` and `<TableHead>Invoices Paid?</TableHead>`.
2. **Body cells (lines 431–488)** — drop the `showQuickBooks &&` wrappers around the two `<TableCell>` blocks containing the popover/calendar for `qb_invoices_approved_date` and `qb_invoices_paid_date`. The popovers and `handleDateSelect('invoices_approved' | 'invoices_paid', ...)` calls (already wired through `useUpdateProjectQBInvoiceDates`) stay as-is, so editing dates works identically on both tabs.
3. **Empty-state colSpan (line 324)** — change from `showQuickBooks ? 11 : 9 / 10 : 8` to a constant 11/10 (with/without reorder column) since the two columns are now always shown.
4. **Footer "Totals" colSpan (line 549)** — change from `showQuickBooks ? 5 : 4` to a constant `6` so the Totals label still spans Address, Manager, Last Reconciliation, Closed Books, Invoices Approved, Invoices Paid before the four Bills cells.

The underlying data columns on `projects` (`qb_invoices_approved_date`, `qb_invoices_paid_date`) are already used by both tabs through `useUpdateProjectQBInvoiceDates`, so no DB or hook changes are needed — and the dates persist regardless of which tab is active.

## Out of scope
No changes to bill-count columns, no schema changes, no renaming of the `qb_…` fields.
