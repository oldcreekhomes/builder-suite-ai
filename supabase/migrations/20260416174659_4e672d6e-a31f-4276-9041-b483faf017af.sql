-- Create project_budget_manual_lines table for multi-row manual budget entries
CREATE TABLE public.project_budget_manual_lines (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id uuid NOT NULL,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  cost_code_id uuid NOT NULL REFERENCES public.cost_codes(id) ON DELETE CASCADE,
  description text,
  notes text,
  unit_price numeric NOT NULL DEFAULT 0,
  quantity numeric NOT NULL DEFAULT 1,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Index for fast hydration lookup
CREATE INDEX idx_pbml_project_costcode 
  ON public.project_budget_manual_lines(project_id, cost_code_id, sort_order);

CREATE INDEX idx_pbml_owner ON public.project_budget_manual_lines(owner_id);

-- Enable RLS
ALTER TABLE public.project_budget_manual_lines ENABLE ROW LEVEL SECURITY;

-- RLS Policies — mirror project_budgets multi-tenant pattern via home_builder
CREATE POLICY "Users can view manual lines in their company"
ON public.project_budget_manual_lines
FOR SELECT
USING (
  owner_id = auth.uid()
  OR owner_id = public.get_current_user_home_builder_id()
);

CREATE POLICY "Users can insert manual lines in their company"
ON public.project_budget_manual_lines
FOR INSERT
WITH CHECK (
  owner_id = auth.uid()
  OR owner_id = public.get_current_user_home_builder_id()
);

CREATE POLICY "Users can update manual lines in their company"
ON public.project_budget_manual_lines
FOR UPDATE
USING (
  owner_id = auth.uid()
  OR owner_id = public.get_current_user_home_builder_id()
);

CREATE POLICY "Users can delete manual lines in their company"
ON public.project_budget_manual_lines
FOR DELETE
USING (
  owner_id = auth.uid()
  OR owner_id = public.get_current_user_home_builder_id()
);

-- updated_at trigger
CREATE TRIGGER update_pbml_updated_at
BEFORE UPDATE ON public.project_budget_manual_lines
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();