

## Plan: Strip Custom Styling, Use Pure shadcn Table Defaults

### Problem
The import review table has custom overrides (`font-mono`, `table-fixed`, explicit column widths, custom text sizes) that make it inconsistent with other tables in the app. The shadcn Table defaults should be used as-is.

### Changes — `src/components/budget/BudgetExcelImportDialog.tsx`

1. **Remove `table-fixed` and all explicit column widths** from `<Table>` and `<TableHead>` elements. Let the table auto-size per shadcn defaults.

2. **Remove all `font-mono`** from Excel Code, Amount, subtotal, and grand total cells. Use the default font.

3. **Remove custom `text-xs`** from Select components — use default sizing.

4. **Remove `text-sm`** from subtotal rows — use default.

5. **Keep only semantic classes**: `text-right` for amounts, `text-center` for status/checkbox, `truncate` for description, and status colors (green/amber/red). These are layout/behavior, not style overrides.

6. **Table container**: Keep `containerClassName="flex-1 overflow-auto border rounded-md"` for scroll behavior within the dialog — this is layout, not style.

### Result
The table will render with shadcn's default `p-2`, `h-10` header, proportional auto-width columns, and default font — matching every other table in the app.

### Files to Edit
- `src/components/budget/BudgetExcelImportDialog.tsx`

