

## Update 4000-Series to Historical Source (Stevenson Lot 507) for Nob Hill Court

### What You Want
For the **100 Nob Hill Court** budget, change all **4000-series** items from **Manual** to **Historical**, sourced from **6330 Stevenson Ave - Lot 507**, with the Total Budget column matching exactly.

### Technical Challenge
The per-row `historical_project_id` column has a foreign key to `projects.id` (UUID only), while `BudgetTableRow` calls the historical lookup **without** a lot filter. This means just setting the source to "historical" won't auto-pull Lot 507's costs — it would look for records with `lot_id IS NULL`.

**Solution**: Set `budget_source = 'historical'` and `historical_project_id = Stevenson project UUID`, **and also** set `unit_price` to the Lot 507 actual cost with `quantity = 1`. The calculation engine falls back to `quantity * unit_price` when the historical lookup returns nothing, so the Total Budget column will show the exact Lot 507 amounts. The badge will display **"Historical"**.

### Implementation — Single Database Migration

One SQL migration that:

1. **Finds** the Lot 507 lot_id dynamically:
   ```sql
   SELECT id FROM project_lots 
   WHERE project_id = 'd9e400a0-...' AND lot_number = 507
   ```

2. **Updates** each 4000-series budget item for Nob Hill Court using a correlated subquery:
   ```sql
   UPDATE project_budgets pb
   SET budget_source = 'historical',
       historical_project_id = 'd9e400a0-...',
       quantity = 1,
       unit_price = COALESCE(
         (SELECT actual_amount FROM project_budgets hist
          WHERE hist.project_id = 'd9e400a0-...'
            AND hist.lot_id = <lot507_id>
            AND hist.cost_code_id = pb.cost_code_id),
         0
       )
   WHERE pb.project_id = '691271e6-e46f-4745-8efb-200500e819f0'
     AND pb.cost_code_id IN (
       SELECT id FROM cost_codes WHERE parent_group = '4000'
     );
   ```

This matches each Nob Hill 4000-series cost code to the same cost code's `actual_amount` from Stevenson Lot 507, ensuring exact dollar-for-dollar alignment.

### No Code Changes
Database-only update. No files modified.

### Result
- All 4000-series items show **"Historical"** badge (blue)
- Total Budget for each item matches Stevenson Lot 507's actual cost exactly
- Items without a matching Lot 507 cost code will show $0.00

