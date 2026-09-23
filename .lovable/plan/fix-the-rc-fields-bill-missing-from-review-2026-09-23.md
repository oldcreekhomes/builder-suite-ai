# Fix the RC Fields bill missing from Review

## What went wrong
When the bill went back to Review, it kept its "archived" mark. The Review list hides anything marked archived, so the counter shows 1 but the list is empty.

## Fix
- Only the Rejected and Archived tabs will look at the archived mark. Review, Approved and Paid will ignore it.
- Sending a bill back to Review, or editing it, will clear the archived mark.
- Clear the mark on RC Fields bill 57637 now, so it shows up in Review right away.

## Technical details
- `BillsApprovalTable.tsx`: apply the `archived_at` filter only when the status list is `['void']`.
- `useBills.resendBillToReview`, plus every other status-change mutation: set `archived_at` and `archived_by` to null.
- Data fix: `update bills set archived_at=null, archived_by=null where id='98286b74-d24b-4f72-8f74-7fc530d5ca62'`.
