-- Create budget_subcategory_selections table
CREATE TABLE public.budget_subcategory_selections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_budget_id UUID NOT NULL REFERENCES public.project_budgets(id) ON DELETE CASCADE,
  cost_code_id UUID NOT NULL REFERENCES public.cost_codes(id) ON DELETE CASCADE,
  included BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(project_budget_id, cost_code_id)
);

-- Enable RLS
ALTER TABLE public.budget_subcategory_selections ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Company users can access all company data
CREATE POLICY "Company users can access budget subcategory selections"
ON public.budget_subcategory_selections
FOR ALL
USING (get_current_user_company() IS NOT NULL)
WITH CHECK (get_current_user_company() IS NOT NULL);

-- Add trigger for updated_at
CREATE TRIGGER update_budget_subcategory_selections_updated_at
BEFORE UPDATE ON public.budget_subcategory_selections
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add index for faster lookups
CREATE INDEX idx_budget_subcategory_selections_project_budget_id 
ON public.budget_subcategory_selections(project_budget_id);

CREATE INDEX idx_budget_subcategory_selections_cost_code_id 
ON public.budget_subcategory_selections(cost_code_id);