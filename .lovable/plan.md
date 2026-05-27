## Add search box to Budget page toolbar

Mirror the Purchase Orders search behavior on the Budget page. Place the input in the toolbar as the leftmost control, so it sits between the lock icon (rendered in the page header) and the expand/collapse button (first item in the BudgetPrintToolbar).

### Changes

1. **`src/components/budget/BudgetPrintToolbar.tsx`**
   - Add `searchQuery` and `onSearchChange` props.
   - Render a search `Input` with `Search` icon (same styling as `PurchaseOrdersTable`: `relative w-64`, `pl-9 h-9`, placeholder `"Search budget..."`) as the first child, before the expand/collapse button.

2. **`src/components/budget/BudgetTable.tsx`**
   - Add `const [searchQuery, setSearchQuery] = useState('')`.
   - Derive a filtered `groupedBudgetItems` (and filtered `budgetItems` for footer/totals if needed) that keeps any row whose cost code, name, or group label matches the query (case-insensitive). Empty groups after filtering are hidden.
   - Pass `searchQuery` / `setSearchQuery` to both `BudgetPrintToolbar` renders (header-bridge and in-content fallback).
   - Include `searchQuery` in the bridge `useEffect` deps so the input updates.
   - Show an empty-state row "No budget items found matching your search." when filter yields nothing.

### Out of scope
- No change to the page-header lock button.
- No change to PO search.
- Totals/subtotals continue to reflect the currently visible (filtered) rows, matching the PO page's behavior.