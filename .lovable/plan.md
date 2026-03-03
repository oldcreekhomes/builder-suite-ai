

## Remove "Actual" Column from Budget Table

The "Actual" column (`w-32`) exists in the budget table header, rows, group headers, group total rows, and project total row. It will be removed from all of them, and the freed space will be redistributed to adjacent columns.

### Changes

**1. `src/components/budget/BudgetTableHeader.tsx`** (line 38)
- Remove `<TableHead className="w-32">Actual</TableHead>`

**2. `src/components/budget/BudgetTableRow.tsx`** (lines 289-318)
- Remove the entire Actual `<TableCell>` block (the editable actual amount cell)
- Remove `onUpdateActual` from props interface and destructuring
- Remove `actualAmount`, `isEditingActual`, `setIsEditingActual` state variables

**3. `src/components/budget/BudgetGroupHeader.tsx`** (line 85)
- Remove `<TableCell className="w-32 py-1"></TableCell>`

**4. `src/components/budget/BudgetGroupTotalRow.tsx`** (lines 64-66)
- Remove `<TableCell className="w-32 ...">` for actual total
- Remove `actualTotal` from props

**5. `src/components/budget/BudgetProjectTotalRow.tsx`** (lines 64-66)
- Remove `<TableCell className="w-32 ...">` for total actual
- Remove `totalActual` from props

**6. `src/components/budget/BudgetTable.tsx`**
- Remove `totalActual` calculation (~lines 431-435)
- Remove `actualTotal` prop from `BudgetGroupTotalRow` usage (~line 623)
- Remove `totalActual` prop from `BudgetProjectTotalRow` usage (~line 686)
- Remove `onUpdateActual` / `handleUpdateActual` if only used for the budget table (keep if used by ActualTable)

### Column Width Redistribution
The removed `w-32` (128px) will be spread to the Name and Total Budget columns:
- Name: `w-[320px]` → `w-[380px]`
- Total Budget: `w-52` → `w-60`

This applies consistently across all 5 components (header, row, group header, group total, project total).

