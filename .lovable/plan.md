

## Fix: Dialog Should Open with Previously Saved Allocation Mode

### Problem
The `allocationMode` state always initializes to `'full'`, regardless of what was last saved. So if a user saved "divide by 19 lots", reopening the dialog shows "full amount" even though the budget table correctly shows the per-lot value.

### Approach: Infer from Saved Data
No schema change needed. When the dialog opens with a selected vendor bid, we can compare the saved `unit_price` against the full bid price:
- If `unit_price ≈ bidPrice` → was saved as `'full'`
- If `unit_price ≈ bidPrice / lotCount` → was saved as `'per-lot'`

### Change

**`src/components/budget/BudgetDetailsModal.tsx`** (line 93):
- Replace the hardcoded `useState('full')` with logic that infers the mode from `budgetItem.unit_price` vs the selected bid's price.
- Use a `useEffect` that runs when the dialog opens (or when `availableBids` load) to detect: if `hasMultipleLots && selectedBidId && budgetItem.unit_price > 0`, find the matching bid price. If `budgetItem.unit_price` is significantly less than the bid price (e.g., approximately `bidPrice / lotCount`), set mode to `'per-lot'`. Otherwise `'full'`.

### Files
1. `src/components/budget/BudgetDetailsModal.tsx` — add useEffect to infer initial `allocationMode` from saved data

