# Fix the 7 OCH checks posted to 1015 instead of 1015.1

## What happened
All 7 saved checks point to 1015 even though you picked 1015.1. The Pay From box keeps two things: the text you see and the account it actually saves. In Multiple Checks these can get out of sync:
- Picking (or re-picking) a project overwrites the bank with the job's saved default, which is 1015, the parent header.
- Typing or editing the Pay From text changes only the text; the saved account stays whatever was filled in before.
So the box can read 1015.1 while 1015 gets saved. Nothing warns you.

## Fix the books (data only)
- Move the bank side of the 7 checks from 1015 to 1015.1 (checks and their journal entry lines). Amounts, dates, payees and the 1710 lines stay the same.
- Change 228 S Washington's default bank to 1015.1 Capital One - Checking.
- Check: 1015 header has $0 of its own activity; 1015.1 drops by $89,000; each entry still balances.

## Stop it from happening again (code)
- Pay From can never save a different account than the one it shows: editing the text clears the saved account until a real pick is made, and Save blocks any row where they don't match.
- Re-picking a project doesn't overwrite a bank you already chose.
- Save refuses parent accounts like 1015 (Multiple Checks, Multiple Deposits, Write Checks, Make Deposits).
- Bank pickers (Write Checks, Multiple Checks, Deposits, Multiple Deposits) hide parent accounts that have sub-accounts.
- If a job's saved default bank is a parent account, it is not auto-filled; the user picks a sub-account.
- Project Accounts tab: the default bank picker can't choose a parent account.

## Then
- Return to the deposits question: enter the 7 matching deposits as Equity: OCH at each job (after you confirm details).
