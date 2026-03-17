

## Filter Subcategories from Import Dropdown

**Problem**: The cost code dropdown in the budget import review dialog shows subcategories (e.g., `4810.1 - Pressure Treated`, `4820.1 - Gates`) alongside parent codes. Users should only see parent-level cost codes when mapping imports.

**Solution**: Filter the cost codes query in `BudgetExcelImportDialog.tsx` to exclude subcategories — i.e., codes whose `parent_group` points to another cost code rather than a top-level group (1000/2000/3000/4000).

### Changes

**File: `src/components/budget/BudgetExcelImportDialog.tsx`**

1. Update the cost codes query to filter out subcategories. A subcategory is any code where `parent_group` is NOT one of the top-level groups (`1000`, `2000`, `3000`, `4000`) and is not null. In practice, filter to only include codes where `parent_group` is in `['1000','2000','3000','4000']` or is null.

2. This affects two places:
   - The `useQuery` fetch (line ~83) — add `.in('parent_group', ['1000','2000','3000','4000'])` to the query
   - The `<SelectContent>` dropdown (line ~311) already iterates `costCodes`, so it will automatically reflect the filtered list

This is a one-line filter addition to the Supabase query. No other files need changes.

