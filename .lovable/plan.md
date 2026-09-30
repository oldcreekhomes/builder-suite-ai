# Cash Position: show each job's starred bank under its project name

## What's wrong
Cash Position already uses each job's starred default bank. For 2401 N Potomac that's account 1010, which the database confirms. The problem is the label: the table shows 1010's company-wide name, "Atlantic Union Bank", and ignores the name set for this project, "John Marshall".

## Fix
- Cash Position will show each job's own name for its bank account. If a job has no custom name, it will show the company-wide name.
- 2401 N Potomac will read "1010 John Marshall".
- The balance and bill numbers stay the same.

## Technical details
- Update the `get_project_cash_position(p_days)` function so that `account_name` returns `COALESCE(project_account_overrides.display_name, accounts.name)`, joined on project_id + account_id.
- No frontend change is needed. `CashPositionCard` already shows `account_name`.
