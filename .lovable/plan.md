# Fix the 7 OCH checks posted to 1015 instead of 1015.1

## What happened
When you picked 228 S Washington, the app auto-filled Pay From with the job's saved default bank, which is **1015** (the parent header). That's the "1015 - Capital One" text in your screenshot. The list under it only offers 1015.1 and 1015.2, but unless one is clicked, the auto-filled 1015 stays and gets saved. So all 7 checks ($89,000, 10/05/2026) posted to the header account.

## Fix the books (data only)
- Move the bank side of the 7 checks from 1015 to 1015.1 (checks and their journal entry lines). Amounts, dates, payees and the 1710 lines stay the same.
- Change 228 S Washington's default bank to 1015.1 Capital One - Checking.
- Check: 1015 header has $0 of its own activity; 1015.1 drops by $89,000; each entry still balances.

## Stop it from happening again (code)
- Bank pickers (Write Checks, Multiple Checks, Deposits, Multiple Deposits) hide parent accounts that have sub-accounts.
- If a job's saved default bank is a parent account, it is not auto-filled; the user picks a sub-account.
- Project Accounts tab: the default bank picker can't choose a parent account.

## Then
- Return to the deposits question: enter the 7 matching deposits as Equity: OCH at each job (after you confirm details).
