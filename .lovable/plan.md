# Archive rejected bills

## What you'll see
- A new **Archived** tab in Manage Bills, below Paid, with a count like the others.
- On the **Rejected** tab only, the Actions (3 dots) menu gets **Archive** in red, below Reject and above Delete Bill. It asks you to confirm first.
- Archive stays off Review, Approved and Paid. Those bills are already on the books, so archiving them would throw off the bank and balance sheet.
- The Archived tab is view-only: you can open the files and notes and add files, like on Paid. You can also delete a bill there. There's no Restore.
- Archived bills never count anywhere: reports, job costs, A/P, budgets, PO billed-to-date, dashboard counts and totals.

## Why this is safe
Rejected bills are already left out of the accounting. Archiving just moves them to their own tab so they're kept for tracking.

## Technical details
- Migration: add `archived_at timestamptz` and `archived_by uuid` to `bills`, plus an index on (project, archived_at). Rejected rows stay `status='void'`, so every report that filters on status keeps leaving them out.
- Rejected tab query and counts (`useBillCounts`, `useBillCountsByProject`, `BillsApprovalTabs`): `status='void' AND archived_at IS NULL`. New Archived tab: `status='void' AND archived_at IS NOT NULL`.
- `useBills`: add an `archiveBill` mutation that sets `archived_at` and `archived_by`, then refreshes the bill lists and counts.
- `BillsApprovalTable`: add the Archive action (destructive, with confirmation) only when the tab is Rejected. On the Archived tab, show Delete only, and use the upload-only files cell.
- Check every place that reads bills with status `void` and make sure archived bills stay excluded.
