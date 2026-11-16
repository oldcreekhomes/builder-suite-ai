# Show the account on deposits in report detail windows

## Problem
Deposits entered on the Job Cost tab (for example, Anchor Loans' $769.09 refund at 923 17th, coded to 2440 Land Carrying Costs) show "-" in the Account column. The window only looks up a deposit's chart-of-accounts account. It never looks up the cost code, but checks already do.

## Fix
In the account detail window used by the Balance Sheet, Income Statement and Job Costs reports, and in its Print view, deposits work the same way checks do:
- If the first deposit line has a cost code, show it (for example, "2440 - Land Carrying Costs").
- Otherwise, show the line's account.
- If the deposit has more than one line, show "+N", the same as on bills.

Display only. No accounting data changes.

## Technical
- `AccountDetailDialog.tsx`: add `cost_code_id` to the `deposit_lines(...)` select, and make sure deposit cost codes are added to `costCodesMap`.
- In the deposit branch (around line 880), prefer `costCodesMap.get(firstLine.cost_code_id)` and fall back to `accountsDisplayMap`.

## Checks
- Find any other report screen that shows deposits with an Account column and apply the same rule there.
