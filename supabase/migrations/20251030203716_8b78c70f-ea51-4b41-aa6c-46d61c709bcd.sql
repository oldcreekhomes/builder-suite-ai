-- Add unique constraint to prevent duplicate budget items per project and cost code
-- This allows upsert operations to work correctly for both new and existing items
ALTER TABLE project_budgets 
ADD CONSTRAINT project_budgets_project_cost_code_unique 
UNIQUE (project_id, cost_code_id);