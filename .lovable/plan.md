# Cash Position — per-job table

## Problem
The Cash Position tab currently shows one company-wide number (all projects combined for one bank account, all approved bills combined). It needs to be broken out by job.

## What it will look like
One table, one row per active job:

| Job | Bank Account | Approved Bills (10/15/20 days) | Total |
|---|---|---|---|
| 923 17th Street | 1015 Capital One | $12,400.00 | $103,951.07 |

- **Job**: street address of the active project.
- **Bank Account**: that job's default bank account (currently Capital One for all), with its balance for that job only.
- **Approved Bills**: approved (posted, not paid, not archived) bills for that job due within the selected window, including overdue. One 10/15/20 selector in the header applies to all rows.
- **Total**: job bank balance minus approved bills. Green if zero or positive, red if negative.
- Footer row with company totals. Refresh button stays.
- Same table on the owner dashboard spot and the accountant Cash Position tab.

## Technical details
- New tenant-scoped RPC `get_project_cash_position(p_days int)` returning per active project: project_id, address, bank account id/code/name, bank balance (journal lines on that account filtered by `project_id`, excluding reversed entries), and approved bills due (bills `status='posted'`, `archived_at is null`, open balance, `project_id` match, due_date <= today + p_days).
- Bank account per job from `project_default_bank_accounts`, falling back to the company `is_default_bank` account.
- Rewrite `CashPositionCard.tsx` as a `table-fixed` shadcn table with `h-11` rows; remove the account dropdown.
- Old RPCs left in place (unused).
