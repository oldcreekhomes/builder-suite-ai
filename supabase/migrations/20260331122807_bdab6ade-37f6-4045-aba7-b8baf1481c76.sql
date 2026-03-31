ALTER TABLE project_budgets DROP CONSTRAINT project_budgets_budget_source_check;
ALTER TABLE project_budgets ADD CONSTRAINT project_budgets_budget_source_check CHECK (budget_source = ANY (ARRAY['estimate'::text, 'vendor-bid'::text, 'manual'::text, 'historical'::text, 'settings'::text, 'actual'::text]));

UPDATE project_budgets 
SET budget_source = 'actual' 
WHERE id IN (
  'e91f5018-12e8-4949-8b21-2cb363253273',
  'bb4ed355-f161-41e2-a556-c7edcc1ae554',
  'e05231f3-590a-4bf5-9da9-61cf9240c6d5'
);