# Roll up Bill Issues per job

## What changes
- The Bill Issues tab starts collapsed: one row per job (address, manager, Late count, Rejected count), grouped by status like now. That makes it about as short as Active Jobs.
- Each job row gets a small arrow. Clicking the row expands it to show its bills (vendor, invoice #, dates, days late, rejected, why, amount, PDF). Clicking again collapses it.
- More than one job can be open at once.
- Searching for a vendor, invoice # or note automatically opens the jobs that match.
- The Totals row stays the same.
- Clicking a job row no longer opens the project page. That moves to a bill row: clicking a bill still opens Manage Bills.

## Technical details
- In `AccountantBillIssuesTable.tsx`, add `expanded: Set<string>` state, render bill rows only when the job is expanded or the search matches bills, and add a `ChevronRight`/`ChevronDown` icon in the address cell.
