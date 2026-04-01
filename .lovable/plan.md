

## Fix: "Failed to update budget source" for Purchase Orders

### Root Cause
The database CHECK constraint `project_budgets_budget_source_check` only allows these values:
`estimate, vendor-bid, manual, historical, settings, actual`

The value `'purchase-orders'` was added to the TypeScript type but **never added to the database constraint**. Every attempt to save a PO source fails with a constraint violation.

### Fix
Add a Supabase migration to drop and recreate the CHECK constraint with `'purchase-orders'` included.

**New migration file:**
```sql
ALTER TABLE public.project_budgets 
  DROP CONSTRAINT project_budgets_budget_source_check;

ALTER TABLE public.project_budgets 
  ADD CONSTRAINT project_budgets_budget_source_check 
  CHECK (budget_source = ANY (ARRAY[
    'estimate','vendor-bid','manual','historical','settings','actual','purchase-orders'
  ]));
```

Also add handling for `purchase-orders` in the `useBudgetSourceUpdate.ts` mutation — currently it falls through without setting quantity/unit_price. Add an `else if` branch for `purchase-orders` that applies `manualQuantity` and `manualUnitPrice` (same as the vendor-bid/manual pattern).

### Files changed
- New migration SQL file
- `src/hooks/useBudgetSourceUpdate.ts` — add `purchase-orders` branch to set quantity/unit_price

