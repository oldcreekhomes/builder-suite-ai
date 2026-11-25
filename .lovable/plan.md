# Fix Manage Bills crash

## What's wrong
The page crashes when the Edit Bill window opens, before the bill finishes loading. The "Confirm Bill Amount Change" message added in the bill-doubling fix reads the bill's total right away, and the bill isn't there yet. It's not caused by today's Overdue change.

## Fix
- Only show the original total in that confirmation once the bill has loaded, so the window never crashes while it's opening.
- Check the window's other new total checks for the same problem, and guard them too.

## Verify
- Open Manage Bills in the preview, open Edit on a bill and check for page errors.
- Run the bill tests.

## Technical details
`src/components/bills/EditBillDialog.tsx` line ~1411: `billData.total_amount` → `billData?.total_amount ?? 0`. Guard line ~572 (`billTotalChanged(Number(billData.total_amount)...)`) with `billData?.`.
