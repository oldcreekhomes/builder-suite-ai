
-- Create project_budgets table to store budget items for each project
CREATE TABLE public.project_budgets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES public.projects(id) NOT NULL,
  cost_code_id UUID REFERENCES public.cost_codes(id) NOT NULL,
  quantity DECIMAL(10,2) DEFAULT 0,
  unit_price DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Enable RLS on project_budgets table
ALTER TABLE public.project_budgets ENABLE ROW LEVEL SECURITY;

-- RLS policies for project_budgets
CREATE POLICY "Users can view budget items for their projects" ON public.project_budgets
  FOR SELECT USING (
    project_id IN (
      SELECT id FROM public.projects WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can create budget items for their projects" ON public.project_budgets
  FOR INSERT WITH CHECK (
    project_id IN (
      SELECT id FROM public.projects WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can update budget items for their projects" ON public.project_budgets
  FOR UPDATE USING (
    project_id IN (
      SELECT id FROM public.projects WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete budget items for their projects" ON public.project_budgets
  FOR DELETE USING (
    project_id IN (
      SELECT id FROM public.projects WHERE owner_id = auth.uid()
    )
  );

-- Create index for better performance
CREATE INDEX idx_project_budgets_project_id ON public.project_budgets(project_id);
