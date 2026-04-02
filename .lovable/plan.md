

## Compact Budget Table: Reduce Column Gaps

### Problem
Despite previous width reductions, the screenshot shows excessive white space between columns — particularly between Source → Total Budget and Comment → Historical. The default shadcn table cell padding (`p-2` = 8px each side) adds 16px per cell, compounding across 8+ columns.

### Fix
Reduce horizontal padding on all cells to `px-1` (4px each side) and tighten several column widths further:

| Column | Current | New |
|--------|---------|-----|
| Checkbox | `w-12` | `w-8` |
| Cost Code | `w-32 pl-8` | `w-28 pl-4` |
| Name | `w-[280px]` | `w-[240px]` |
| Source | `w-28` | `w-20` |
| Warning | `w-10 px-0` | `w-6 px-0` |
| Total Budget | `w-40 pl-3 pr-3` | `w-32 px-1` |
| Comment | `w-48` | `w-44` |
| Historical | `w-40 pl-3` | `w-32 px-1` |
| Variance | `w-36` | `w-28 px-1` |

Additionally, add `px-1` to all header and body cells that don't already have custom padding, reducing the default 8px per-side to 4px.

### Savings
~120px from width reductions + ~128px from padding reduction = ~248px total saved.

### Files changed (6 files, consistent widths + padding in each)
- `BudgetTableHeader.tsx` — header cell widths and padding
- `BudgetTableRow.tsx` — body cell widths and padding
- `BudgetGroupHeader.tsx` — group header cells
- `BudgetGroupTotalRow.tsx` — subtotal row cells
- `BudgetProjectTotalRow.tsx` — project total row cells
- `HistoricalOnlyRow.tsx` — historical-only row cells

