# Bill Issues tab on the Accountant Dashboard

## What you'll get
A new tab **Bill Issues** right after "Multiple Project Entries". It only lists jobs that have Late or Rejected bills — jobs with no problems don't show at all.

It looks exactly like Active Jobs: same card, title row with search box, same compact rows, status group labels (In Design, Permitting, Under Construction, Completed), same red count circles, same Totals row.

## Layout
```text
Bill Issues   [Search...]
Address / Vendor     Manager  Invoice #  Bill Date  Due Date  Issue     How Late   Amount     File
Under Construction
2401 N Potomac St      EG                                       12 Late  7 Rejected
   ABC Building Supply        12345     Sep 01     Sep 30     Late      30 days    $1,250.00  [pdf]
   Carter Lumber              5678      Oct 02     Oct 15     Rejected  15 days    $480.00    [pdf]
     note: "wrong cost code"  (the rejection note, shown on hover / under the row)
...
Totals                                                   43 Late  29 Rejected
```
- One job row (street address + manager initials + Late / Rejected counts), with each problem bill listed under it.
- **Issue:** Late (past due, not paid), Rejected, or both.
- **How late:** days past the due date ("—" if no due date).
- **Why:** for rejected bills, the rejection note is shown.
- **File icon:** click to open the invoice PDF in the same preview used elsewhere, without leaving the dashboard. Blank if no file.
- Clicking a bill row opens that job's Manage Bills on the right tab (Rejected or Review), same as clicking the red circles today.
- Counts match the Late and Rejected circles on Active Jobs exactly (same rules: archived and reversed bills excluded; Builder Suite / QuickBooks toggle not applied — all jobs with issues show).

## Technical details
- New `src/components/accountant-dashboard/AccountantBillIssuesTable.tsx`, reusing helpers/styling from `AccountantJobsTable.tsx` (`table-compact`, `PROJECT_STATUS_GROUPS`, street address, initials).
- New hook `useBillIssuesByProject` fetching bills (`draft/posted/void`, not archived/reversal) with vendor name, `reference_number`, `bill_date`, `due_date`, `total_amount`, `notes`, plus `bill_attachments`; late/rejected classification extracted into a shared pure function used by both `useBillCountsByProject` and the new hook, with a small test so the counts can't drift.
- Files open via `useUniversalFilePreview`.
- Add the tab in `src/pages/Index.tsx`.
