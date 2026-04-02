

## Compact Budget Table Layout

### Problem
The budget table's combined column widths (~1596px) plus the sidebar push content off-screen on a 24" monitor.

### Fix
Reduce column widths across all budget table components. Key reductions:

| Column | Current | New |
|--------|---------|-----|
| Cost Code | w-40 + pl-12 | w-32 + pl-8 |
| Name | w-[340px] | w-[280px] |
| Source | w-36 | w-28 |
| Total Budget | w-60 | w-40 |
| Comment | w-56 | w-48 |
| Historical | w-52 | w-40 |
| Variance | w-48 | w-36 |

This saves ~280px total, fitting comfortably on a 1920px screen with sidebar.

### Files changed (6 files, same width adjustments in each)
- `BudgetTableHeader.tsx`
- `BudgetTableRow.tsx`
- `BudgetGroupHeader.tsx`
- `BudgetGroupTotalRow.tsx`
- `BudgetProjectTotalRow.tsx`
- `HistoricalOnlyRow.tsx`

