# Auto-Organize Bank Statements — 228 South Washington Street ONLY

Goal: stop the 122-item "Unassigned" pile in the Bank Statements dialog for this one project by creating the real statement accounts and auto-filing every existing PDF into them. No other project is touched.

## Accounts to create (this project only)

Based on the actual folder names already used on these 122 files:

| Account | Type | Files found today |
|---|---|---|
| Sandy Spring Bank | Bank | 30 (2023–2025) |
| Atlantic Union - Checking | Bank | 2026 "Checking" files |
| Atlantic Union - Savings | Bank | 2026 "Savings" / "AUB Savings" files |
| BOA Credit Card | Credit card | 23 (2023–2025) |
| AMEX CC - 32000 | Credit card | 27 |
| AMEX CC - 61001 | Credit card | 25 |
| AMEX 35003 | Credit card | 2026 files |

Display order: banks first (Sandy Spring, AUB Checking, AUB Savings), then credit cards.

## How files get assigned

Each file is matched by its stored folder path first, then by filename keywords:

```text
.../Bank Statements/<year>/Sandy Spring Bank/...   -> Sandy Spring Bank
.../Bank Statements/<year>/BOA Credit Card/...     -> BOA Credit Card
.../AMEX CC - 32000/ or name contains 32000        -> AMEX CC - 32000
.../AMEX CC - 61001/ or name contains 61001        -> AMEX CC - 61001
.../AMEX 35003/ or name contains 35003             -> AMEX 35003
.../Checking/ or name contains "Checking"          -> Atlantic Union - Checking
.../Savings/ or name contains "Savings" / "AUB"    -> Atlantic Union - Savings
```

Anything that still doesn't match (a handful of loose PDFs sitting at the year root, e.g. `001-0000001769368318-31-Mar-2026.pdf`, `OLD CREEK HOMES - 2026-05-29.pdf`, `2026 03-document (6).pdf`) stays in **Unassigned** and is listed back to you so you can tell me which account each belongs to — I won't guess and mis-file them.

## Also filled in while assigning

- Any statement missing a Statement End Date gets one derived from its filename/folder (month + year, last day of month). Files whose date can't be derived are left blank rather than guessed wrong.

## Result in the dialog

Collapsible sections per account, newest-first inside each, with the Unassigned group shrinking to only the true stragglers. Accounts are editable/renameable/reorderable via the Accounts button, and you can drag-free reassign any row from its "..." menu.

## Technical notes

- Data-only work: inserts into `project_statement_accounts` scoped to `project_id = dfad3ec5-…` and updates to `project_files.statement_account_id` / `statement_date` restricted to that same project id.
- No schema changes, no UI code changes (the grouped UI already ships).
- Exact per-account counts are re-verified during execution and reported back.

## Confirm

If the correct names differ (for example you want "AUB - Checking 1234" or a Capital One account added), tell me the exact labels and I'll use those instead.
