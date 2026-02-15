

## Standardize All Settings Tables to Match shadcn/ui Defaults

### Problem

Despite previous standardization efforts, there are still several inconsistencies between Cost Codes, Specifications, and Chart of Accounts tables, and none of them match the shadcn/ui table defaults exactly.

Key differences found:

1. **Custom CSS variables override shadcn defaults** -- The `table.tsx` component uses `--table-head-h`, `--table-cell-py`, `--table-cell-px` CSS variables instead of shadcn's default classes (`h-10 px-2` for `TableHead`, `p-2` for `TableCell`).
2. **Global CSS overrides** in `index.css` force `p-3` and `text-sm font-medium` on all `th`/`td` elements, which conflicts with component-level styling.
3. **Specification group rows have a thick border** (`border-b-2`) while Cost Code group rows do not.
4. **Cost Code group rows** use hardcoded `bg-gray-50`, `h-10`, `py-1`, `font-semibold text-gray-700` overrides.
5. **Chart of Accounts has no checkbox column** while Cost Codes and Specifications do.
6. **Cost Codes "Sub Categories" header** wraps to two lines because column widths are too narrow.

### Changes

**1. Reset `table.tsx` to shadcn defaults**

Replace the CSS-variable-based classes with shadcn's actual default classes:
- `TableHead`: `h-10 px-2 text-left align-middle font-medium text-muted-foreground` (instead of `h-[var(--table-head-h)] px-[var(--table-cell-px)]`)
- `TableCell`: `p-2 align-middle` (instead of `py-[var(--table-cell-py)] px-[var(--table-cell-px)]`)

**2. Remove global table CSS overrides from `index.css`**

Delete the `table thead th` and `table tbody td` rules (lines 132-138) that force `p-3` on everything. The component classes should be the single source of truth.

**3. Remove unused CSS variables from `index.css`**

Delete `--table-head-h`, `--table-cell-py`, `--table-cell-px` since they will no longer be referenced.

**4. Fix `SpecificationGroupRow.tsx`**

Remove `border-b-2` from the group row (make it match normal `border-b` like every other row).

**5. Fix `CostCodeGroupRow.tsx`**

Remove hardcoded `bg-gray-50 h-10` and `py-1` overrides. Use consistent group row styling (`bg-muted/30` to match Specification groups, or remove background entirely).

**6. Add checkbox column to Chart of Accounts**

Add a checkbox column to `ChartOfAccountsTab.tsx` table header and rows, with select-all in the header, matching Cost Codes and Specifications.

### Technical Details

| File | Change |
|------|--------|
| `src/components/ui/table.tsx` | Replace CSS variable classes with shadcn defaults: `h-10 px-2` for TableHead, `p-2` for TableCell |
| `src/index.css` | Remove lines 17-19 (table CSS variables) and lines 132-138 (global table th/td overrides) |
| `src/components/settings/SpecificationGroupRow.tsx` | Remove `border-b-2` from TableRow className |
| `src/components/settings/CostCodeGroupRow.tsx` | Remove `bg-gray-50 h-10` and all `py-1` overrides. Use `bg-muted/30` for group styling consistency |
| `src/components/settings/ChartOfAccountsTab.tsx` | Add checkbox column (header + rows) with select-all behavior |

### Result

All three settings tables (and every other table in the app) will render identically to the shadcn/ui table example: same row height, same cell padding, same header weight, same border thickness. The only visual differences will be their column content.

