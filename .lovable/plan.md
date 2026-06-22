## Goal

Allow adding a new account from the **Edit Project → Chart of Accounts** tab that is scoped to ONLY the currently-edited project. It must NOT appear in:
- The global Chart of Accounts (Settings)
- Any other project's Chart of Accounts
- Any other project's reports, pickers, or transactions

Most useful for adding project-specific Equity sub-accounts (e.g., per-investor equity rows).

## Approach

Add a nullable `project_id` column to `accounts`. When `project_id IS NULL`, the account is global (current behavior). When set, the account is private to that project.

Filter rules:
- Global Chart of Accounts (`useAccounts`, Settings tab): only show rows where `project_id IS NULL`.
- Project Chart of Accounts (`ProjectAccountsTab` + balance sheet / income statement / pickers when scoped to a project): show rows where `project_id IS NULL OR project_id = <currentProjectId>`.
- Project-scoped accounts cannot be excluded via `project_account_exclusions` (always enabled for their project), and the checkbox is hidden/locked.

## Steps

### 1. Database migration
- Add `project_id uuid NULL REFERENCES public.projects(id) ON DELETE CASCADE` to `public.accounts`.
- Index `(owner_id, project_id)` for filtering.
- Update RLS so a user can only create/read/update/delete a project-scoped account if they can access that project (reuse the same tenant scoping already used for global accounts; add `project_id` predicate where needed).

### 2. New dialog: `AddProjectAccountDialog`
- File: `src/components/AddProjectAccountDialog.tsx`.
- Visually identical to `src/components/settings/AddAccountDialog.tsx` (same fields: Code, Name, Type, Subtype, Parent, Description).
- Parent dropdown lists both global root accounts of the chosen type AND existing project-scoped roots for the same project.
- On submit, insert into `accounts` with `project_id = <projectId>` and the tenant `owner_id` (same way `useAccounts.createAccount` resolves it). Toast on success/failure. Invalidate `accounts-for-project-selection` and `accounts`.

### 3. Wire into `ProjectAccountsTab`
- Add a small header row above the type list with an **Add Account** button (uses the existing button styling from Settings).
- Update its `accounts-for-project-selection` query to filter `project_id.is.null,project_id.eq.<projectId>` (Supabase `.or()`).
- Render project-scoped rows with a subtle "Project only" badge so the user can distinguish them. Their exclusion checkbox is hidden (always included for this project); show a trash icon instead to delete the project-scoped account (with confirmation, blocked when there's any activity, mirroring the existing balance guard).

### 4. Filter global Chart of Accounts
- In `src/hooks/useAccounts.ts` global fetch, add `.is('project_id', null)` so project-only accounts never appear in Settings.

### 5. Project-scoped reads everywhere else
For each consumer of `accounts` that is currently project-aware, accept the project's accounts too. Specifically extend filters to `project_id IS NULL OR project_id = currentProjectId` in:
- `src/components/reports/BalanceSheetContent.tsx`, `src/pages/BalanceSheet.tsx`
- `src/components/reports/IncomeStatementContent.tsx`, `src/pages/IncomeStatement.tsx`
- `src/components/reports/AccountsPayableContent.tsx`
- `src/components/accounting/AccountDetailDialog.tsx`
- `src/components/accounting/SendReportsDialog.tsx` (only the project-scoped report branches)
- `src/components/bills/ManualBillEntry.tsx` and `src/components/bills/EditExtractedBillDialog.tsx` account pickers (when a project context exists)
- `src/hooks/useChecks.ts`, `src/hooks/useDeposits.ts` account-name lookups

Non-project-scoped consumers (true global lists with no project context) keep `project_id IS NULL`.

## Out of scope
- No changes to journal entry / bill / check schemas — they already reference `accounts.id` which works regardless of scope.
- No UI in global Settings to mark an existing global account as project-only.
- Default-bank star (`is_default_bank`) on project-scoped accounts is not exposed; the project still uses `project_default_bank_accounts` for its bank default.

## Technical notes
- Tables affected: `accounts` (new nullable `project_id` column + FK + index + RLS update).
- New file: `src/components/AddProjectAccountDialog.tsx`.
- Edited files: `src/components/ProjectAccountsTab.tsx`, `src/hooks/useAccounts.ts`, plus the report/picker files listed in step 5.
- `useProjectAccountNames` and `project_account_overrides` continue to work unchanged (overrides keyed by `account_id`).
