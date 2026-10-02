# Fix "Memorize" on Write Checks for job cost lines

## Problem
When a check uses Job Cost lines (e.g. 2440 - Land Carrying Costs across lots), clicking Memorize fails with a "foreign key" error. The save sends the cost code into the chart-of-accounts slot instead of the cost code slot.

## Fix
- In Write Checks, when memorizing, send Job Cost lines with the cost code in the cost code field (account left empty). Expense lines stay as they are.
- No database changes.

## Result
The Erica Gray $3,000 check at Nob Hill (all 19 lots) will memorize successfully and appear under Recurring.

## Technical details
`src/components/transactions/WriteChecksContent.tsx` ~line 1731: change job_cost mapping from `account_id: r.accountId` to `cost_code_id: r.accountId`. Credit Cards already maps correctly; loading back (line 593) already reads `cost_code_id` for job_cost.
