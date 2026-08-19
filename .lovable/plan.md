# Fix the 126 Longview balance sheet imbalance ($5.94)

## What's actually wrong

Assets show $1,542,880.28 but Liabilities & Equity show $1,542,886.22 — off by exactly $5.94.

Confirmed cause (verified in the data): there is one journal line on 126 Longview for $5.94 debited to account **5000: Office Expenses**, with the offsetting credit sitting in Accounts Payable. Account 5000 is marked as **excluded** for this project in the project account exclusions list.

The Balance Sheet already protects asset/liability/equity accounts from being hidden by exclusions, but revenue and expense accounts are dropped unconditionally — including from the Current Year Earnings roll-up. So the AP credit is counted while the $5.94 expense is not, and the equation breaks. Current Year Earnings shows exactly $1,530,000.00 instead of $1,529,994.06.

This is structural: any excluded revenue/expense account with activity on any project will throw its balance sheet out by that amount.

## The fix

Current Year Earnings must always be computed from **all** revenue and expense activity on the project, regardless of exclusions. Exclusions stay a display-only setting for the Income Statement; they must never remove money from the balance sheet math.

After the change, 126 Longview reads:
- Current Year Earnings: $1,529,994.06
- Total Equity: $1,529,994.06
- Total Liabilities & Equity: $1,542,880.28 = Total Assets

Applied in all three places the balance sheet is computed so the on-screen report, the standalone page, and the emailed PDF stay identical:
- `src/components/reports/BalanceSheetContent.tsx`
- `src/pages/BalanceSheet.tsx`
- `src/components/accounting/SendReportsDialog.tsx`

## Technical notes

In each balance sheet computation, the exclusion skip currently returns early for `revenue`/`expense` accounts before their balance is added to `revenueBalance`/`expenseBalance`. Change it so revenue/expense balances are always accumulated into net income, and the exclusion only suppresses the account from any displayed line list. Balance-sheet account handling (assets/liabilities/equity, only excluded when the balance is zero) stays exactly as it is.

No data changes and no changes to the Income Statement, Job Costs, or the exclusions UI.

## Separate note (no action unless you want it)

The $5.94 Office Expenses line on 126 Longview is real posted activity on an account you've excluded from this job. Once the fix is in it will roll into earnings correctly, but if that charge belongs on a different cost code, say the word and I'll recode it.
