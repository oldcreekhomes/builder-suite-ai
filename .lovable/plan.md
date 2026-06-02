## Goal

Backfill historical actuals for **6330 Stevenson Avenue – Lot 506** (OCH at Edgewood Towns, project `d9e400a0…`, lot `5d28a702…`) so it appears in the Budget page's **Historical** dropdown alongside Lots 501 and 507.

## How historical projects work

A lot shows up in the Historical dropdown when there is at least one `project_budgets` row for that `(project_id, lot_id)` pair with a non-zero `actual_amount` (see `src/utils/fetchHistoricalActualCosts.ts` and the existing "Historical Viz" memory). Lot 501 has 112 such rows; Lot 506 currently has 0.

The existing rows for Lot 501 use this exact shape, which we'll mirror:

```
project_id        = d9e400a0-f9b9-40c6-8b8e-183341e508f3   (6330 Stevenson Avenue)
lot_id            = 5d28a702-82fa-4416-8d86-d47c24f8a566   (Lot 506)
cost_code_id      = <lookup by code under owner 2653aba8…>
actual_amount     = <Act. Cost from PDF>
quantity          = 1
unit_price        = 0
budget_source     = 'manual'
```

## Plan

### One migration: insert Lot 506 actuals from `506.pdf`

The migration will:

1. Use a single CTE that maps every cost-code string from the PDF's "Act. Cost" column to its dollar value.
2. Resolve each code via `cost_codes` filtered by `owner_id = 2653aba8-d154-4301-99bf-77d559492e19`.
3. `INSERT INTO project_budgets (...)` one row per code with the shape above, using `ON CONFLICT (project_id, cost_code_id, lot_id) DO UPDATE SET actual_amount = EXCLUDED.actual_amount, budget_source = 'manual'` so it's safely re-runnable.

### Codes / amounts being loaded (from `506.pdf`, Act. Cost column)

PDF total: **$713,572.02** across **~110 cost codes** spanning 1000 Land, 2000 Soft, 3000 Site, 4000 Homebuilding.

A few PDF entries need clarification before I run the migration:

- **4005 Back Charges – Other = $163.93** → maps to cost code `4005`
- **4005.1 Foundation Issues = $845.34** → maps to cost code `4005.1`
- **4010.1 … 4010.6** → mapped to those decimal sub-codes
- **4830 Landscaping** uses Act. Cost = $6,745.60 (the budget shows $5,164.03; we use actuals)

If any of those decimal-suffix codes (`4005.1`, `4010.1`–`4010.6`) don't exist in your cost-code list, the migration will fail loudly so we can either add them or roll them up to the parent before re-running.

### Out of scope

- No new tables, no schema changes, no UI changes.
- Lot 501 / 507 data is untouched.
- Lot 506's budget rows for other projects/contexts are untouched (the upsert is keyed strictly on `project_id + cost_code_id + lot_id`).

### After the migration

Refresh the Budget page → click the Historical dropdown → "6330 Stevenson Ave – Lot 506" will appear. Selecting it will pull the actuals into the Historical column.
