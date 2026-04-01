

## Fix: Add Cents to Budget PDF Print

### Problem
The Budget PDF export rounds all currency values to whole dollars (e.g., `$62,500` instead of `$62,500.00`), causing a mismatch with the budget table UI which displays cents.

### Fix
In `src/components/budget/pdf/BudgetPdfDocument.tsx`, update the `formatCurrency` function:
- Change `minimumFractionDigits: 0` → `minimumFractionDigits: 2`
- Change `maximumFractionDigits: 0` → `maximumFractionDigits: 2`
- Remove `Math.round()` wrapper

This matches the currency formatting standard used throughout the budget table UI.

### Files changed
- `src/components/budget/pdf/BudgetPdfDocument.tsx` — update `formatCurrency` to show 2 decimal places

