# Keep the Balance Sheet Balanced and Current

## Goal
Make the 126 Longview report immediately show the corrected balance and prevent excluded accounts from ever breaking the accounting equation again.

## Confirmed diagnosis
- The database currently balances as of August 19, 2026: **Assets $1,542,886.22 = Liabilities & Equity $1,542,886.22**.
- The Highlighters charge is correctly posted as a $5.94 debit to WIP with cost code **4040: Office Supplies**, offset by $5.94 in Accounts Payable.
- The screenshot still shows the old WIP and Total Assets values because the already-open Balance Sheet query has not refreshed after the direct database correction.
- The on-screen and emailed Balance Sheet calculations currently skip excluded revenue/expense accounts before adding their activity to Current Year Earnings. That can recreate an imbalance even though the journal entries themselves balance.

## Changes
1. **Correct the Balance Sheet math**
   - Always include every revenue and expense balance in Current Year Earnings before applying display exclusions.
   - Continue hiding excluded revenue/expense rows from report detail, but never remove their amounts from the accounting equation.
   - Preserve the existing rule that non-zero asset, liability, and equity accounts cannot be hidden.

2. **Apply the same rule everywhere**
   - Update the project Reports screen and emailed Balance Sheet PDF generation so they use identical calculations.
   - Align the standalone Balance Sheet route with the same as-of-date and reversal filters instead of its older independent calculation.

3. **Prevent stale report values**
   - Refresh the Balance Sheet query when relevant journal-entry data changes, so corrections appear without a browser refresh.
   - Keep the query scoped to the current project and selected as-of date.

4. **Retire account 5000**
   - Mark **5000: Office Expenses** inactive so it is no longer available for future entry.
   - Historical journal activity remains intact for audit and reporting.

5. **Verify**
   - Confirm 126 Longview displays WIP of **$1,528,807.66** and both totals of **$1,542,886.22**.
   - Verify the on-screen report, standalone report, and emailed PDF calculate the same totals.
   - Test an excluded expense account with activity and confirm it remains hidden while the Balance Sheet stays balanced.

## Technical details
- Primary files: `BalanceSheetContent.tsx`, `BalanceSheet.tsx`, and `SendReportsDialog.tsx`.
- Use cent-precise accumulation and the existing as-of-aware reversal rules.
- The account retirement is a data update only; no historical rows will be deleted or rewritten.