

## Set All Budget Items to "Manual" Source at $0

### What's happening now
All budget items for this project (100 Nob Hill) have `budget_source` set to `NULL`. This causes the legacy fallback logic to kick in, which for cost codes with `has_subcategories` pulls in estimate/subcategory totals (e.g., Civil Engineering $19,500, Surveying $5,900, MEP Engineering $5,360). That's why some items show "Estimate" badges with non-zero dollar amounts.

### Fix
This is a **data-only** change — no code modifications needed.

Run a single UPDATE on the `project_budgets` table to set `budget_source = 'manual'` for all items in this project. Since `quantity` and `unit_price` are already `0` on every row, the `manual` source calculation (`quantity × unit_price`) will return $0 for all items, and the source badge will show "Manual" everywhere.

```sql
UPDATE project_budgets
SET budget_source = 'manual'
WHERE project_id = '691271e6-e46f-4745-8efb-200500e819f0';
```

This updates approximately 45 rows. The UI will reflect the changes on the next page refresh or query refetch — every item will show "Manual" with $0.

