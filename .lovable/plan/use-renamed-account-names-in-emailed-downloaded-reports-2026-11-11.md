# Use renamed account names in emailed/downloaded reports

## Problem
When an account is renamed for a job (e.g. 412 E Nelson: 2540 "Loan - 2nd DR 2nd Position", 2550 "Refinance Loan"), the on-screen Balance Sheet shows the new name, but the Send Reports PDFs (Download All / Preview All / email) still show the original company-wide name ("Loan Refinance", "Loan - Oxford").

## Fix
- The Send Reports window looks up the job's renamed accounts and uses those names on the Balance Sheet and Income Statement PDFs, the same way the screen does.
- Accounts not renamed keep their normal name. Amounts don't change.
- Going forward, any rename on a job's Accounts tab shows up in both the screen and the PDFs right away.

## Technical details
- `src/components/accounting/SendReportsDialog.tsx`: fetch `project_account_overrides` (account_id, display_name) for `projectId` once at the start of generation; replace `name: account.name` (BS ~247/255/263, IS ~371/379) with `resolveAccountName(account, overrides)` from `src/hooks/useProjectAccountNames.ts`.
- Check the Account Detail PDF title uses the same override and fix it if not.
