# Combine the three income accounts into "3130 - Income"

## What's there today (company-wide, Old Creek Homes)
- **3100**: its real name is "Construction Management Fees". It only shows as "Income" because 115 E. Oceanwatch Ct renamed it for that project. It has 2 check lines from 103 E Oxford Ave on 5/27/2026 ($898.20 and $898.19, "Sending equity to Chesterbrook to close out job").
- **3120 - Sales, Single Family Custom**: 3 entries:
  - 126 Longview Dr sale, $1,530,000
  - 923 17th St sale, $2,115,000
  - 2401 N Potomac deposit, $0.20
- **3130 - Income**: 5 entries. This is the account we keep.

## What I'll do
1. Move every 3100 and 3120 entry onto 3130, everywhere in the app:
   - journal lines, checks, deposits, bills, pending bills and credit card lines
   - memorized/recurring lines and project settings, such as account renames, hidden accounts, statement accounts and default accounts
2. Delete accounts 3100 and 3120.
3. Remove the duplicate rows in project settings, so 3130 shows up only once per project.
4. Amounts, dates, memos, bank balances and reconciliations stay exactly the same. Only the income account label changes. Total income on every report stays the same; it is now all under one line.

## Heads up
- The two Oxford checks ($1,796.39) sit on the "Construction Management Fees" account today. After the move they will reduce Income on the 103 E Oxford report.
- The two property sales will now show as "Income" instead of "Sales, Single Family Custom".
- Another builder has its own 3120 account. That one is not touched.

## Technical details
- Data-only change, run with `run_sql` in one transaction:
  - target `5dfe07e2-1ba6-463d-93dd-5ae169d7ee5e`
  - sources `b4fa6bb7-c85f-4dce-9a60-79df325ce28f` (3100) and `218d8137-0a59-4de9-877b-a665c651d813` (3120)
- `UPDATE ... SET account_id = target` on: journal_entry_lines, check_lines, deposit_lines, bill_lines, pending_bill_lines, credit_card_lines (if it has the column), recurring_transaction_lines, and the `accounts.parent_id` children.
- For project_account_overrides, project_account_exclusions, project_statement_accounts and project_default_deposit_accounts: first delete source rows that would collide with an existing target row for the same project, then repoint the rest.
- Then `DELETE FROM accounts WHERE id IN (sources)`.
- Afterwards, check that no references remain and that total revenue per project is unchanged.
- No code changes. The posting is not affected by closed periods because the bank side is untouched.
