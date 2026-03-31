

## Update 1000-Series Source to "Actual" for Nob Hill Court

### The Ask
Change the Source badge from "Manual" to "Actual" for all 1000-series budget items on the 100 Nob Hill Court project (id: `691271e6-e46f-4745-8efb-200500e819f0`).

### Small Catch
The current code only recognizes these budget_source values: `manual`, `estimate`, `vendor-bid`, `historical`, `settings`. There is no `actual` type yet. If I only update the database, the badge will **still show "Manual"** because the UI doesn't know how to display "Actual."

This requires **one tiny code change** (3 lines) in `BudgetSourceBadge.tsx` to add an `'actual'` case, plus the database update.

### Plan

**1. Code change — BudgetSourceBadge.tsx**
Add a new case in the `budget_source` switch:
```ts
case 'actual':
  return {
    label: 'Actual',
    className: 'bg-teal-100 text-teal-700 border-teal-200',
    tooltip: 'From actual costs'
  };
```

**2. Database migration**
```sql
UPDATE project_budgets
SET budget_source = 'actual'
WHERE project_id = '691271e6-e46f-4745-8efb-200500e819f0'
  AND cost_code_id IN (
    SELECT id FROM cost_codes WHERE code LIKE '1%' AND parent_group = '1000'
  );
```

This targets only the 1000-series items (1010, 1020, 1040) for Nob Hill Court, changing their source from `manual` to `actual`.

### Result
- Source badge for 1010, 1020, 1040 will display **"Actual"** in teal
- Budget calculation for `'actual'` source will fall through to `quantity * unit_price` (same as manual), so dollar amounts stay unchanged
- No other projects affected

