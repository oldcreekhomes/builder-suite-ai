Revert the unwanted changes to the PM Accounting Alerts card:

1. **`src/components/ProjectWarnings.tsx`** — Remove the "Paid" column and its date picker entirely. Restore original 3-column layout (Current / Late / Approved). Keep the Approved date picker/sync logic working.

2. **`src/hooks/useAccountingManagerBills.ts`** — Restore the `.eq('accounting_manager', user.id)` filter so the card only shows projects where the current user is the accounting manager. Remove the `qb_invoices_paid_date` field from the query and `ProjectBillSummary` interface (no longer needed without Paid column).

3. **`src/components/ProjectWarnings.tsx` (address display)** — Truncate the displayed project name to just the street number + street name. Strip city/state/zip (e.g. "6330 Stevenson Avenue Alexandria VA 22304" → "6330 Stevenson Avenue"). Apply via a small helper that splits on the city token or trims trailing state/zip patterns.

Sync hooks (`useUpdateProjectQBInvoiceDates`, etc.) stay as-is — they still correctly invalidate caches for the Approved date.