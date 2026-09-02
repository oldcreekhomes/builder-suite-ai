# Add a "Statement" PDF column to Reconciliation History

## Goal

On the Reconcile Accounts screen (Transactions → Reconcile Accounts), each row in the **Reconciliation History** table gets a new **Statement** column that links to the uploaded statement PDF for that account and period, so the user can download/review it directly.

## How the match works

Statement PDFs already live in `project_files` with:
- `statement_account_id` → `project_statement_accounts` (which optionally links to a COA account via `account_id`)
- `statement_date` (statement period end date)

For each reconciliation row (`bank_reconciliations` has `bank_account_id` + `statement_date`):

1. Find statement accounts for this project whose `account_id` equals the reconciliation's `bank_account_id`.
2. Among files assigned to those statement accounts, match the file whose `statement_date` equals the reconciliation's `statement_date` (fall back to same month/year if no exact day match).
3. If found, show a PDF icon button; clicking it downloads the PDF via the existing storage download path (`project-files` bucket, same approach as the Statements dialog). If no match, show `-`.

## Changes

- `src/components/transactions/ReconcileAccountsContent.tsx`
  - Add a query (gated on the selected bank account) fetching this project's statement accounts (with `account_id`) and their statement files (`storage_path`, `statement_date`, `original_filename`).
  - Add a **Statement** column between Statement Date and Beginning Balance in the Reconciliation History table.
  - Cell renders a PDF icon button (`FileText`, matching the Statements dialog styling) that downloads the matched file with a tooltip showing the clean statement label; `-` when no statement exists for that period.

## Notes

- No database or RLS changes — everything reads existing `project_files` / `project_statement_accounts` data.
- No changes to the Review dialog or Statements dialog.
- Unassigned statements won't appear until they're assigned to a statement account that is linked to the bank account (they can link accounts in the Statements → Accounts manager).
