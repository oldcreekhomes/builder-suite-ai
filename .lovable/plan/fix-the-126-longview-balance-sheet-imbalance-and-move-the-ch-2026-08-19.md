# Fix the 126 Longview balance sheet imbalance and move the charge to 4040 Office Supplies

## What's actually wrong

Assets show $1,542,880.28 but Liabilities & Equity show $1,542,886.22 — off by exactly $5.94.

Verified in the data: bill line "Highlighters" for $5.94 (bill dated 05/14/2026, paid) on 126 Longview posts to account **5000: Office Expenses**, with the offsetting credit in Accounts Payable. Account 5000 is marked **excluded** for this project, so the Balance Sheet drops the expense from Current Year Earnings while still counting the AP credit — the equation breaks by that exact $5.94.

## What will be done

1. **Create account 4040: Office Supplies** (expense, active, company-wide — available on every project). There is no 4000-series account today; this starts it.
2. **Move the $5.94 charge** to 4040: update the bill line and its journal entry line so the "Highlighters" charge posts to 4040 Office Supplies instead of 5000. The bill total, payment, and AP are untouched.
3. **Retire 5000: Office Expenses** — mark it inactive so it can no longer be picked anywhere in the app. It will have no activity left after step 2.
4. **Fix the underlying report bug** so this can never break the equation again: Current Year Earnings must be computed from all revenue and expense activity on a project, even when an account is excluded from the project. Exclusions stay a display-only setting; they must never remove money from balance-sheet math.

After this, 126 Longview reads Current Year Earnings $1,529,994.06, Total Equity $1,529,994.06, and Total Liabilities & Equity $1,542,880.28 = Total Assets.

## Technical notes

- Data changes: insert the 4040 account row, update `bill_lines.account_id` and `journal_entry_lines.account_id` for the single $5.94 line, set `accounts.is_active = false` on 5000.
- Report fix applies in all three places the balance sheet is computed so screen, page, and emailed PDF stay identical: `src/components/reports/BalanceSheetContent.tsx`, `src/pages/BalanceSheet.tsx`, `src/components/accounting/SendReportsDialog.tsx`. In each, the exclusion skip currently returns before revenue/expense balances are accumulated into net income; change it so those balances always roll into net income and the exclusion only hides the account from displayed lists. Asset/liability/equity handling stays exactly as it is.
- No changes to the Income Statement, Job Costs, or the exclusions UI.
