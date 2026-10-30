# Fix: can't save edits on approved bill credits

## What's wrong
The 3 rows at the top are **bill credits** (-$203.38, Carter Lumber, 2401 A/B/C). The other 10 are normal bills, so they save fine.

When you save an approved bill, the app rebuilds its accounting lines. For a credit, the amount is negative, so it tries to write a line like "credit -$203.38". The books only allow positive amounts on each line, so the save is refused. That causes the red "journal_entry_lines_check" error. Your due date was never the problem.

## Fix
- Change the approved-bill save so credits write positive amounts on the same side they're on now (the side doesn't change, only the sign does). Normal bills are unaffected.
- Then set the due date to 11/15/2026 on all 3 credits and confirm each one still balances.

## Optional (ask before doing)
Add a "15th of next month" choice to Terms so these Carter Lumber bills fill in their due date automatically.

## Technical details
- `update_approved_bill_atomic` (latest migration `20260825162400`), journal line insert ~line 173-174: use `abs(v_amount_cents)` for debit/credit. The check-constraint requires one side = 0 and the other > 0.
- Verify: query the 3 bills' journal lines after the edit, and check debits = credits.
