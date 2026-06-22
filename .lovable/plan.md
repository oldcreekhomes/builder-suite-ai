## Problem

`AccountSearchInput` (used in Journal Entry, Write Checks, Make Deposits, etc.) only shows global accounts because it relies on `useAccounts()`, which hard-filters `.is('project_id', null)`.

Account `2905.3` ("Equity - EG") is scoped to the current project (`project_id = 350e5951-1a6f-4809-9d4e-7652d58603b9`), so it never appears in the dropdown. The user expects all 3 children of 2905 (`2905.1`, `2905.2`, `2905.3`) to be selectable when working inside this project.

## Solution

Update `AccountSearchInput` so that when a `projectId` prop is provided, it also fetches accounts scoped to that project and merges them with the global list before filtering, sorting, and rendering.

### Files to change

1. **`src/components/AccountSearchInput.tsx`**
   - Add a `useQuery` that fetches project-scoped accounts when `projectId` is present:
     ```
     .from('accounts')
     .select('id, code, name, type, parent_id, subtype, project_id')
     .eq('is_active', true)
     .eq('project_id', projectId)
     .order('code')
     ```
   - Merge the project-scoped results with `accounts` from `useAccounts()` before applying type filtering, exclusion filtering, and search filtering.
   - Ensure merged list is sorted by code.

2. **`src/components/AccountSearchInputInline.tsx`** (same pattern)
   - Apply the same fix: fetch project-scoped accounts when `projectId` is provided and merge them into the filtered list.

### No database changes required

The `accounts` table already has the `project_id` column and the data exists. This is purely a client-side data fetch fix.

### Verification

After the change, opening the Account dropdown on the Journal Entry form inside this project should show:
- `2905.1 - Equity Partner #1`
- `2905.2 - Equity Partner #2`
- `2905.3 - Equity - EG`

These should appear alongside all other global accounts, respecting existing type filters and project exclusions.