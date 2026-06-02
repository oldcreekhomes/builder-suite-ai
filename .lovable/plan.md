
# Make Historical Subtotals a Live Calculation

## Goal
The "Subtotal for 1000 / 2000 / 3000 / 4000…" rows in the Historical Costs column must be a real sum of every Historical Cost value displayed in that group (both regular budget rows and historical-only rows). Today the math is close, but it's wired through several sources and easy to drift from what's on screen. We'll make it a single, auditable sum so we can confirm nothing is missing.

## Changes

### 1. `BudgetTable.tsx` — compute subtotals from displayed rows
For each group, build the same merged row list that's already rendered (budget rows + missing-historical rows), then sum the Historical Cost shown for each:
- Budget row historical value = `historicalActualCosts[costCode.code] ?? 0`
- Historical-only row historical value = `row.amount`
- Subtotal = sum of those values for the group

Lift this into a small helper (e.g. `getGroupHistoricalSubtotal(group, items)`) so the exact same array drives both the rendered rows and the subtotal — no chance of a row being shown but not counted (or vice versa).

### 2. Project total = sum of group subtotals
Replace `totalHistorical={historicalTotal}` (which comes from `useHistoricalActualCosts().total` and counts every record in the historical project, even those that aren't grouped/displayed) with the sum of the group subtotals computed in step 1. This guarantees:

```text
Project Total Historical  ==  Σ (group subtotals)  ==  Σ (every Historical Cost cell on screen)
```

If those numbers differ from what the user expects, we'll immediately know a cost code is missing from the displayed groups rather than silently rolling up into the project total.

### 3. Always show the computed subtotal
`BudgetGroupTotalRow` currently renders `-` when `historicalTotal` is 0 or falsy. Show `$0.00` instead when a historical project is selected so empty groups are obvious (and not confused with "not calculated").

### 4. Groups that exist only in historical
The "historical-only groups" block (around line 689) already sums `items.reduce(...)`. Keep it, and include it in the project-total sum from step 2 so those subtotals also roll up.

## Out of scope
- No changes to the hardcoded `actual_amount` values in `project_budgets` — those remain the source of truth for Lot 506.
- No changes to budget-side calculations, variance logic, or column visibility.
- No schema changes.

## Verification
After the change, open Lot 1 with Historical = `6330 Stevenson Ave - Lot 506`:
- Add up the Historical Cost cells in group 1000 by eye → must equal the "Subtotal for 1000" cell.
- Repeat for 2000 / 3000 / 4000.
- The four subtotals (plus any historical-only group subtotals) must equal the "Total" row's Historical column.
- Specific spot checks the user already called out: Sediment & Erosion = $2,092.91, Demolition = $2,257.14, and Staging / Sales Commissions / Loan Closing Costs must appear as their own rows (via `missingHistoricalByGroup`) and be included in the 2000-series subtotal.
