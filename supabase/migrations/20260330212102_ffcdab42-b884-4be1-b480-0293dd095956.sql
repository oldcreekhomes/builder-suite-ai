
-- Drop the old unique constraint that doesn't account for lot_id
ALTER TABLE project_budgets DROP CONSTRAINT project_budgets_project_cost_code_unique;

-- Add new unique constraint that includes lot_id (using COALESCE for null lot_ids)
CREATE UNIQUE INDEX project_budgets_project_lot_cost_code_unique 
ON project_budgets (project_id, COALESCE(lot_id, '00000000-0000-0000-0000-000000000000'::uuid), cost_code_id);
