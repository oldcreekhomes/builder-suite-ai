

## Per-Project Chart of Accounts Selection

### Overview
Add a new "Chart of Accounts" tab inside the Edit Project dialog that lets users check/uncheck which accounts apply to each project. Excluded accounts will be hidden from that project's Balance Sheet and Income Statement.

### Database Change

**New table: `project_account_exclusions`**
- `id` (uuid, PK)
- `project_id` (uuid, FK to projects, NOT NULL)
- `account_id` (uuid, FK to accounts, NOT NULL)
- `created_at` (timestamptz)
- Unique constraint on (project_id, account_id)
- RLS enabled with policies matching the projects table access pattern

This "exclusion" approach means all accounts are included by default -- users only need to uncheck the ones that don't apply. No data migration needed.

### UI Changes

**1. Edit Project Dialog (`src/components/EditProjectDialog.tsx`)**
- Add a Tabs component inside the dialog with two tabs: "Project Details" (existing form) and "Chart of Accounts" (new)
- Widen the dialog slightly to accommodate the accounts list (`sm:max-w-[650px]`)

**2. New Component: `src/components/ProjectAccountsTab.tsx`**
- Receives `projectId` as prop
- Fetches all active accounts grouped by type (Asset, Liability, Equity, Revenue, Expense)
- Fetches current exclusions from `project_account_exclusions`
- Displays each group as a collapsible section with account code, name, and a checkbox
- Checked = account is used in this project (default); Unchecked = excluded
- On toggle, inserts or deletes from `project_account_exclusions`
- Changes are saved immediately (no need to hit "Update Project")

### Report Filtering

**3. Balance Sheet (`src/components/reports/BalanceSheetContent.tsx`)**
- When `projectId` is provided, fetch excluded account IDs from `project_account_exclusions`
- Filter out excluded accounts before categorizing into assets/liabilities/equity
- This happens at line ~116 where accounts are iterated

**4. Income Statement (`src/components/reports/IncomeStatementContent.tsx`)**
- Same filtering: exclude accounts that appear in `project_account_exclusions` for the given project

### Files to Create
- `supabase/migrations/[timestamp]_create_project_account_exclusions.sql` -- new table + RLS
- `src/components/ProjectAccountsTab.tsx` -- checkbox UI for account selection

### Files to Modify
- `src/components/EditProjectDialog.tsx` -- add Tabs with "Project Details" and "Chart of Accounts"
- `src/components/reports/BalanceSheetContent.tsx` -- filter out excluded accounts
- `src/components/reports/IncomeStatementContent.tsx` -- filter out excluded accounts
- `src/integrations/supabase/types.ts` -- auto-updated with new table type

