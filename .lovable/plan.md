

## Add Purchase Orders and Historical Tabs to Budget Details Dialog

### Summary
Add two new tabs ("Purchase Orders" and "Historical") to the Budget Details dialog, making all 5 tabs always visible. Only one tab's data can be applied at a time. Empty states show "no data available" messages.

### Current State
- Dialog shows: Estimate (conditional), Vendor Bid, Manual
- `BudgetDetailsPurchaseOrderTab` component already exists but is standalone (not in the dialog)
- Historical hooks exist: `useHistoricalProjects`, `useHistoricalActualCosts`, `useBudgetSourceUpdate` already supports `'historical'` source
- `project_budgets` table has `historical_project_id` and `budget_source` columns

### Changes

**`src/components/budget/BudgetDetailsModal.tsx`**

1. **Always show all 5 tabs**: Estimate, Vendor Bid, Manual, Purchase Orders, Historical — remove the conditional `hasSubcategories` gate on Estimate tab (always show it; empty state if no subcategories)

2. **Update `getInitialTab`** to handle `'purchase-orders'` and `'historical'` sources

3. **Purchase Orders tab**: Embed `BudgetDetailsPurchaseOrderTab` inline (or refactor it to be selectable). Show approved POs for this project + cost code. Since POs are informational (committed costs), this tab is read-only — selecting it as the active source sets `budget_source = 'purchase-orders'` or simply displays the data. Given the existing pattern, this tab will show PO data but the "Apply" action would set the source. If no POs exist, show "No approved purchase orders for this cost code."

4. **Historical tab**: 
   - Use `useHistoricalProjects()` to list projects with actual costs
   - Use `useHistoricalActualCosts(selectedProjectId)` to get the cost for this specific cost code
   - UI: dropdown/select to pick a historical project, then display the actual cost for this cost code from that project
   - On Apply with historical tab active: call `updateSource({ source: 'historical', historicalProjectId })` 
   - Initialize selected historical project from `budgetItem.historical_project_id` if source is historical
   - Empty state: "No historical projects with actual costs available."

5. **Uniform empty states**: Each tab with no data shows centered text "No [data type] available for this cost code" with a Total Budget: $0 footer

6. **handleApply updates**: Add cases for `'purchase-orders'` and `'historical'` sources

### Files to Edit
1. `src/components/budget/BudgetDetailsModal.tsx` — add PO and Historical tabs, always show all 5 tabs, update apply logic

