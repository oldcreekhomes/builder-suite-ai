Fix the mistaken coupling between the project default bank account and the project default Deposit To account.

## Current mistake

The star beside bank accounts and the dropdown on `1020 - Deposits` both write to `project_default_bank_accounts`. That means changing the deposit dropdown changes the default bank star, and changing the star changes the deposit dropdown.

These must be independent:

- Bank account default: used by Write Checks, Pay Bills, Reconcile, etc.
- Deposit To default: used only by Make Deposits as the default account money is deposited into.

## Changes to make

1. Add a separate project-level setting for the default deposit-to bank account.
   - New table: `public.project_default_deposit_accounts`
   - Columns: `project_id`, `account_id`, `created_at`, `updated_at`
   - RLS and grants will mirror `project_default_bank_accounts`.
   - Seed existing rows from current `project_default_bank_accounts` so users do not lose their current defaults during migration.

2. Update `Edit Project -> Chart of Accounts`.
   - The star remains tied only to `project_default_bank_accounts`.
   - The dropdown on `1020 - Deposits` reads/writes only `project_default_deposit_accounts`.
   - Changing one will no longer change the other.

3. Update Make Deposits.
   - New deposits should auto-fill from `project_default_deposit_accounts`.
   - If a project has no deposit default yet, fall back to the project default bank/global bank so the app still has a sensible initial value.
   - The Deposit To field still allows changing to any included bank account.

4. Do not change Write Checks, Pay Bills, or Reconcile behavior.
   - They continue using the star/default bank account only.

## Files / database

- Add one Supabase migration for the new setting table, grants, RLS, and seed data.
- Add a hook like `useProjectDefaultDepositAccountId`.
- Update `src/components/ProjectAccountsTab.tsx`.
- Update `src/components/transactions/MakeDepositsContent.tsx`.

This is an app-wide fix, not specific to Longview Drive.