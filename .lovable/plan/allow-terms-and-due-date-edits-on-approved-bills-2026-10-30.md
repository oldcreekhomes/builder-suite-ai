# Allow Terms and Due Date edits on Approved bills

## Is it a security risk?
No. Terms and Due Date only decide when a bill is due and whether it shows as Late. They don't change the amount, cost codes, lots, vendor or any accounting entry, so the Balance Sheet, A/P and job costs stay the same. Only people who can already edit bills will be able to change them.

## What changes
- In Edit Bill, the Terms dropdown and Bill Due Date unlock on Approved bills. Changing Terms recalculates the due date, the same way it works on drafts.
- The note at the top changes to: "Only date, terms, due date, cost code, description, and equal lot division can be modified for approved bills."
- Paid bills stay locked, since they can't be late anymore.
- Closed periods stay locked, same as today.
- Every change is stamped with who made it, as all edits already are.

## Technical details
- `EditBillDialog.tsx`: drop `disabled={isApprovedBill}` on the Terms Select and Due Date picker when status is `approved`/`posted`; keep locked for `paid`.
- Confirm the approved save path (`updateApprovedBill` / `update_approved_bill_atomic`) writes `terms` and `due_date`; if not, write those two columns with a plain update on `bills` after the atomic call. No journal entries touched.
- Small test: the late rule respects the new terms/due date (Paid at Purchase on an approved bill is never late).
