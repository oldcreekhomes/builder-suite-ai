## Fix expense account dropdown + project-only row UI

### 1. Edit Bill / Enter Bill — Expense tab shows only 3 accounts
The Expense-tab account picker calls `AccountSearchInput` without a `projectId`, so it never merges in the project-scoped accounts (5120 Water, 5140 HOA, … 6020 Pool Maintenance) that appear as "Project only" in Edit Project → Chart of Accounts.

Change: pass the expense row's selected project into the picker.
- `src/components/bills/EditBillDialog.tsx` — expense row `<AccountSearchInput ... />`: add `projectId={row.projectId || undefined}`.
- `src/components/bills/ManualBillEntry.tsx` — same change on its expense row picker.

`AccountSearchInput` already fetches project-scoped accounts and merges them when `projectId` is set, so no other changes are needed. The list refreshes when the user changes the Project column on that row.

### 2. Edit Project → Chart of Accounts — project-only rows
In `src/components/ProjectAccountsTab.tsx`, rows where `isProjectScoped` is true currently render an empty spacer (no checkbox) and always show a trash icon.

Change:
- Render the same `<Checkbox />` used for global rows on project-only rows, defaulted to checked.
- Unchecking opens the existing `DeleteConfirmationDialog` via `setDeleteTarget(account)`. Confirming runs the existing `deleteProjectAccount()` (which already blocks deletion when the account has project activity).
- Remove the standalone trash icon button next to project-only rows.

Other row affordances (default-bank star, deposit-account select, inline rename) are unchanged.

### Out of scope
No changes to RLS, database schema, global-account behavior, or any other dialog (Journal Entry, Deposits, Checks, Credit Cards, Job Cost tab).