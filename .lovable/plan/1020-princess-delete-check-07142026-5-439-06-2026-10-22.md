# 1020 Princess: delete check 07142026 ($5,439.06)

Data-only change. No code edits.

## What I checked
- Check 07142026, 07/14/2026, Old Creek Homes, LLC, $5,439.06, paid from 1015 Capital One, two lines to 2905.1 ($5,439.05 + $0.01).
- **Closed period:** yes. 1020 Princess books are closed through 07/31/2026.
- **Reconciled:** no. The check and its accounting entry lines are not reconciled.
- It was entered 10/19/2026. It has no attachments.

## The change
1. Delete the check, its 2 lines, and its accounting entry using the same delete the app already uses (`delete_check_with_journal_entries`).
2. The closed July period stays closed. The delete runs only on this one check.

## Effect on reports
- 1015 Capital One goes up by $5,439.06.
- 2905.1 Equity goes up by $5,439.06 (the debit goes away).
- July 2026 numbers at 1020 Princess change by this amount even though July is closed. Balance Sheet still balances.

## Check afterward
Read the data back to confirm the check and its entry are gone, and that no other check was touched.
