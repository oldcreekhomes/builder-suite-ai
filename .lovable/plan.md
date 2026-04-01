

## Fix: Purchase Orders Badge Showing as "Estimate"

### Problem
The `BudgetSourceBadge` component's switch statement has no `case 'purchase-orders'`. When `budget_source = 'purchase-orders'`, it falls through the switch without matching, then the legacy logic sees `has_subcategories` on the cost code and displays "Estimate".

### Fix
Add a `case 'purchase-orders'` to the switch in `src/components/budget/BudgetSourceBadge.tsx` that returns a distinct badge (e.g., teal/cyan styling with label "Purchase Order").

### Files Changed
- `src/components/budget/BudgetSourceBadge.tsx` — add missing case

