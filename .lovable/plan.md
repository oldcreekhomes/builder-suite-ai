

## Plan: Fix Status Header Legend and Convert to shadcn Table

### Issues
1. **Blue checkmarks** indicate "mapped" status (Excel sub-code mapped to a different system cost code via `KNOWN_MAPPINGS`). Green = direct match, blue = mapped, red = unmatched. The header just says "Status" with no legend — need to add a legend in the summary bar.
2. **Raw HTML table** — currently uses `<table>`, `<thead>`, `<tbody>`, `<tr>`, `<td>`, `<th>` instead of shadcn `Table`, `TableHeader`, `TableBody`, `TableRow`, `TableHead`, `TableCell`.

### Changes

**File: `src/components/budget/BudgetExcelImportDialog.tsx`**

1. **Add shadcn Table import** — replace `Checkbox` usage stays, but add `Table, TableHeader, TableBody, TableRow, TableHead, TableCell` from `@/components/ui/table`.

2. **Update summary bar** — split matched count into two:
   - Green icon + "X matched" (direct matches)
   - Blue icon + "X mapped" (via known mappings)
   - Red icon + "X unmatched"

3. **Replace raw HTML table** with shadcn components:
   - `<table>` → `<Table>`
   - `<thead>` → `<TableHeader>`
   - `<tbody>` → `<TableBody>`
   - `<tr>` → `<TableRow>`
   - `<th>` → `<TableHead>`
   - `<td>` → `<TableCell>`
   - Remove manual `p-2` padding (shadcn handles it)
   - Keep `table-fixed` and explicit column widths per project standards

4. **Subtotal and grand total rows** use `<TableRow>` with appropriate styling.

### Files to Edit
- `src/components/budget/BudgetExcelImportDialog.tsx` — import shadcn table components, update summary legend, replace all raw table elements

