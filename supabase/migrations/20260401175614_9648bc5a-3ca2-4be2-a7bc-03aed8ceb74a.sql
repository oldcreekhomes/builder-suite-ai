ALTER TABLE public.project_budgets 
  DROP CONSTRAINT project_budgets_budget_source_check;

ALTER TABLE public.project_budgets 
  ADD CONSTRAINT project_budgets_budget_source_check 
  CHECK (budget_source = ANY (ARRAY[
    'estimate','vendor-bid','manual','historical','settings','actual','purchase-orders'
  ]));