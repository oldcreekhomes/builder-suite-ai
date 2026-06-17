# Clear Invoices Approved / Invoices Paid dates

Goal: let the accountant reset either date back to a dash so the column needs to be re-verified. Manual only — no auto-reset.

## UX

In `AccountantJobsTable.tsx`, for each `Invoices Approved?` and `Invoices Paid?` cell that currently shows a date:

- Keep the existing click-the-date behavior (opens the calendar to pick a new date).
- Add a small `×` icon that appears on row hover, immediately to the right of the date text. Muted gray, turns red on hover.
- Clicking the `×` clears that single cell back to `-` (no confirm dialog — it's one click to restore, just re-pick a date).
- When the cell is already `-`, the `×` is not rendered.

This gives two ways to clear, both per-cell, no bulk action and no scheduled reset:
1. Hover `×` on the date (fast).
2. Open the calendar and... (we'll also wire the calendar's currently-selected day to act as a toggle so re-clicking the highlighted day clears it — cheap secondary path).

## Implementation

File: `src/components/accountant-dashboard/AccountantJobsTable.tsx`

1. Wrap each date `<button>` in a `group relative` container so a sibling `×` button can show on `group-hover`.
2. Add an `XIcon` button (lucide `X`) absolutely positioned at the right edge of the cell, rendered only when the date is set. `onClick` calls `e.stopPropagation()` then `updateInvoiceDates.mutate({ projectId, field, date: null })`.
3. In the `Calendar` `onSelect`, if the picked date equals the currently selected date, pass `null` instead (toggle-off behavior).

File: `src/hooks/useUpdateProjectQBInvoiceDates.ts`

- Already accepts `date: string | null` and writes null to the column. No change needed beyond confirming the mutation handles null (it does — `formattedDate` is computed only when date is provided; verify and adjust to explicitly pass `null` through if needed).

File: `src/components/accountant-dashboard/AccountantJobsTable.tsx` (handler)

- `handleDateSelect` currently formats and sends a date. Extend to accept `null` and forward as `date: null` to the mutation.

## Out of scope

- No bulk "Clear All" header button.
- No monthly auto-reset job.
- No changes to Last Reconciliation or Closed Books columns.
- No backend/DB schema changes (columns already nullable).
