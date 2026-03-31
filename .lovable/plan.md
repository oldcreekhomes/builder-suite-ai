

## Fix: Historical Source Should Pull Lot-Specific Costs

### Problem
When you select "6330 Stevenson Ave - Lot 507" as the historical source, only the project UUID gets saved to `historical_project_id` (FK constraint prevents storing the composite `projectId::lotId` key). The lookup hooks (`useMultipleHistoricalCosts`, `useHistoricalActualCosts` in `BudgetTableRow`) then query **all lots** for that project, summing costs across every lot — producing inflated/doubled values.

### Solution — 3 Parts

**1. Database: Add `historical_lot_id` column**

New nullable UUID column on `project_budgets` referencing `project_lots.id`. This stores which specific lot's actuals to use.

Migration also updates the existing Nob Hill 4000-series rows to set `historical_lot_id = '8ae0a660-...'` (Lot 507).

**2. Code: Make historical lookups lot-aware**

Files changed:

- **`src/hooks/useMultipleHistoricalCosts.ts`** — Accept composite keys (`projectId::lotId`) instead of plain UUIDs. Parse them, add `lot_id` filter to the query when a lot is specified. Key the result map by composite key.

- **`src/hooks/useBudgetItemTotals.ts`** — Build composite keys from `historical_project_id` + `historical_lot_id` when constructing the lookup set and reading results.

- **`src/components/budget/BudgetTableRow.tsx`** — Pass `item.historical_lot_id` to `useHistoricalActualCosts` so the per-row fetch is also lot-filtered.

- **`src/components/budget/BudgetTableFooter.tsx`** — Same composite key pattern as `useBudgetItemTotals`.

- **`src/utils/budgetUtils.ts`** — For the `'historical'` case, prefer `quantity * unit_price` when explicitly set (so the baked-in DB values work as a fallback even if the lookup misses).

**3. Code: Save lot ID when setting historical source**

- **`src/hooks/useBudgetSourceUpdate.ts`** — Add `historicalLotId` param. Save to `historical_lot_id` column when source is `'historical'`; clear it for other sources.

- **`src/components/budget/BudgetDetailsModal.tsx`** — Extract lotId from the composite key via `parseHistoricalKey` and pass it to `updateSource`.

### Result
- Historical items tied to a specific lot will only pull that lot's actual costs
- The 4000-series on Nob Hill will show the correct Lot 507 values (not doubled)
- No impact on historical items without a lot (they continue to query all records with `lot_id IS NULL`)

