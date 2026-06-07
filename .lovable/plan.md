# Guard: Prevent Unchecking COA Rows With Activity

## Goal
In the project-level Chart of Accounts toggle UI (`ProjectAccountsTab.tsx`), block users from unchecking any account that has non-zero journal activity scoped to the current project. Show a toast that names the account and its current project balance.

## Behavior
- Checking an account: unchanged (always allowed).
- Unchecking an account:
  1. Query `journal_entry_lines` filtered by `account_id` and `project_id` (current project).
  2. Compute `balance = SUM(debit) - SUM(credit)` using cent-precise math (`Math.round(x*100)/100`).
  3. If `|balance| > 0.005`: block the uncheck (do not mutate state, do not persist) and show an error toast:
     - Title: "Cannot disable account"
     - Description: `"{account_number} {account_name} has a project balance of {formatted $balance}. Clear or reassign the activity before disabling."`
  4. If balance is exactly $0 (or no lines exist for this project): allow the uncheck as today.

## Implementation Notes
- File: `src/components/projects/.../ProjectAccountsTab.tsx` (the component owning the COA checkbox toggle).
- Use existing supabase client and the existing batching helper (`batchedIn`) is not needed — single account_id query.
- Use `sonner` toast (`toast.error`).
- Format balance with the project's currency formatter (2 fraction digits, matches Currency Formatting Standard memory).
- Guard runs client-side at uncheck time; no DB schema or migration required.
- No change to check (enable) flow, no change to other tabs, no balance sheet logic touched in this task.

## Verification
- Try to uncheck `1050 Loan to OCH at Lexington` on Oxford project → blocked with toast showing $75,000.00.
- Uncheck an account with zero project activity → succeeds as before.
- Re-check a previously disabled account → succeeds as before.
