# Reconcile Accounts: show the project's account name on outstanding items

## What's happening

The deposit is saved to the right account. Account 2550 has a company-wide name, "Loan - Oxford". The database shows 413 E Nelson (and 412 E Nelson) rename it to "Refinance Loan" for those projects. Make Deposits uses the project's name. The reconciling-items list on Reconcile Accounts uses the company-wide name instead, in both the Account column and the hover breakdown. The same thing would happen at 100 Nob Hill, where 2550 is renamed "Loan - Ascent".

## Fix

On Reconcile Accounts, label every outstanding check, bill payment and deposit account with the project's name for that account. For example, "2550: Refinance Loan +1" at 413 Nelson. Do the same in the hover breakdown. Nothing in your saved data changes.

## Technical detail

- `src/components/transactions/ReconcileAccountsContent.tsx`: the screen already loads `accountOverrides` through `useProjectAccountNames(projectId)`. Pass the overrides into `AllocationCell` / `getAllocationDisplay`, or resolve them where the allocation breakdowns are built. The display text and tooltip then use `resolveAccountName({id, name}, overrides)` in place of the raw `alloc.name`. This means each allocation must carry its account id.
- Check `ReconciliationReviewDialog` for the same raw-name pattern and fix it there too.
