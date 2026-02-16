

## Add Sub-Account (Parent/Child) Support to Chart of Accounts

### Overview
Enable hierarchical accounts where a parent account (e.g., `2905 Equity`) can have sub-accounts (e.g., `2905.1 Equity Partner #1`, `2905.2 Equity Partner #2`). The database already supports this via the `parent_id` column on the `accounts` table -- this plan wires it into the UI across all touchpoints.

### Changes

**1. Add Account Dialog (`src/components/settings/AddAccountDialog.tsx`)**
- Add an optional "Parent Account" dropdown (Select) that lists existing accounts filtered by the selected type
- When a parent is selected, auto-inherit the account type from the parent (lock the type selector)
- Pass `parent_id` to `createAccount.mutateAsync()`

**2. Edit Account Dialog (`src/components/settings/EditAccountDialog.tsx`)**
- Add the same optional "Parent Account" dropdown
- Pre-populate with the current `parent_id` value
- Include a "None" option to remove the parent
- Save `parent_id` in the update mutation

**3. `useAccounts` Hook (`src/hooks/useAccounts.ts`)**
- Update the `AccountData` interface (already has `parent_id` -- no change needed)
- Ensure the accounts query fetches `parent_id` (update select to include it, or use `*` which already does)

**4. Chart of Accounts Table (`src/components/settings/ChartOfAccountsTab.tsx`)**
- Group accounts hierarchically: show parent accounts as rows, then indent child accounts beneath them
- Child rows get a left padding/indent to visually indicate hierarchy
- Accounts with no parent remain at root level
- Add a "Parent" column or visually indent the code/name columns

**5. Edit Project Dialog - Account Selection (`src/components/ProjectAccountsTab.tsx`)**
- Show sub-accounts indented under their parent within each type group
- When a parent account is unchecked, optionally uncheck all children too (or just visually nest them)

**6. Balance Sheet Report (`src/components/reports/BalanceSheetContent.tsx`)**
- Group sub-accounts under their parent account
- Show each sub-account indented with its individual balance
- Show the parent account with its own direct balance (if any)
- The parent total is the sum of its direct balance plus all children
- Sub-account balances still roll up into category totals (Total Assets, Total Equity, etc.)

**7. Income Statement Report (`src/components/reports/IncomeStatementContent.tsx`)**
- Same hierarchical display pattern as the Balance Sheet for revenue and expense accounts with sub-accounts

### Technical Details

**Data Model** (already exists):
- `accounts.parent_id` references `accounts.id` (nullable)
- Sub-accounts inherit the `type` from their parent
- The `code` convention (e.g., `2905.1`) is user-managed, not enforced by the system

**Grouping Logic** (shared utility):
- Create a helper function `groupAccountsByParent(accounts)` that returns:
  - Root accounts (where `parent_id` is null)
  - A map of `parentId -> childAccounts[]`
- Reuse this in the COA table, project accounts tab, and reports

**Balance Sheet Rendering**:
- For each category (assets, liabilities, equity), iterate root accounts
- If a root account has children, render the parent as a group header, then render each child indented
- Parent balance = its own journal entry balance (direct postings to parent)
- Children appear individually below the parent
- All balances still sum into the section total as before

**No database migration needed** -- the `parent_id` column and foreign key already exist.

