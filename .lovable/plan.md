

## Reorder Budget Details Tabs & Add "Actual" Tab

**Problem**: The Budget Details modal tabs are in a non-alphabetical order (Estimate, Vendor Bid, Manual, Purchase Orders, Historical), and there's no "Actual" tab to show actual costs to date.

**Current order**: Estimate → Vendor Bid → Manual → Purchase Orders → Historical

**New order (alphabetical)**: Actual → Estimate → Historical → Manual → Purchase Orders → Vendor Bid

### Changes

**File: `src/components/budget/BudgetDetailsModal.tsx`**

1. **Reorder the `<TabsTrigger>` elements** alphabetically: Actual, Estimate, Historical, Manual, Purchase Orders, Vendor Bid

2. **Add "Actual" tab content** — a read-only view showing:
   - The `actual_amount` from the current `budgetItem` (already available as `budgetItem.actual_amount`)
   - A simple table with Cost Code, Description, and Actual Cost columns (same layout as the Historical tab's table)
   - A Total row at the bottom
   - This tab is display-only — no "Apply" action needed since actual costs are entered elsewhere (the Actual table on the budget page)

3. **Add `actual` to the tab value type and `getInitialTab` logic** — if `budget_source` is `'actual'`, default to that tab. The Apply button for this tab is not needed since actuals are informational, but we'll keep the existing Apply/Cancel footer consistent.

4. **Handle "actual" in `handleApply`** — simply close the dialog since this is a read-only reference tab (no source change needed).

This is a single-file change to `BudgetDetailsModal.tsx`. No new hooks or queries needed — `budgetItem.actual_amount` is already available.

