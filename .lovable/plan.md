## Problem

On the project Budget page, the "Actual" column for historical-source rows is empty for 4050 / 4060 / 4070 / 4100 even though the source historical project clearly has those actuals. Reason: the column reads from a single map driven by the dropdown-selected historical project (`historicalActualCosts` prop), and that project happens to not have those four cost codes. Each budget row already stores its own `historical_project_id` / `historical_lot_id`, and `BudgetTableRow` already fetches them into `historicalCostForItem` — that value is just never rendered.

## Fix

In `src/components/budget/BudgetTableRow.tsx`:

- When `item.budget_source === 'historical'` and `historicalCostForItem` is defined, render the Actual column from `historicalCostForItem`.
- Otherwise fall back to the existing dropdown-driven `historicalActualCosts[costCode.code]`.
- Use the same value when computing `variance` so the Variance column also reflects the per-row historical source.

No DB changes. No other components touched.

## Technical notes

- `historicalCostForItem` (lines 84–87) already exists and uses `useHistoricalActualCosts(item.historical_project_id, item.historical_lot_id)`.
- Update `const historicalActual = ...` (line 123) to: `const historicalActual = (item.budget_source === 'historical' && historicalCostForItem !== undefined) ? historicalCostForItem : (costCode?.code ? (historicalActualCosts[costCode.code] ?? null) : null);`
- Keep `0` as a valid value (don't coerce to null) so a true $0 actual still renders instead of "-".

## Out of scope

- Adjusting the four budget numbers to match the user's exact PDF figures (68.21 / 115.98 / 319.61 / 1,871.78 vs DB 68.19 / 115.99 / 319.60 / 1,871.77). Confirm separately whether to overwrite with the PDF values.
