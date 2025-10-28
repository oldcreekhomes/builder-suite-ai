-- Add budget_source and historical_project_id to project_budgets table
ALTER TABLE project_budgets 
ADD COLUMN IF NOT EXISTS budget_source text CHECK (budget_source IN ('estimate', 'vendor-bid', 'manual', 'historical', 'settings')),
ADD COLUMN IF NOT EXISTS historical_project_id uuid REFERENCES projects(id);

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_project_budgets_budget_source ON project_budgets(budget_source);
CREATE INDEX IF NOT EXISTS idx_project_budgets_historical_project_id ON project_budgets(historical_project_id);