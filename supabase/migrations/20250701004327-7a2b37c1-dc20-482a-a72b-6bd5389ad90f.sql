
-- Create project_bidding table to store bidding packages for projects
CREATE TABLE public.project_bidding (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  cost_code_id UUID NOT NULL REFERENCES public.cost_codes(id) ON DELETE CASCADE,
  quantity NUMERIC DEFAULT 0,
  unit_price NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Enable RLS on project_bidding table
ALTER TABLE public.project_bidding ENABLE ROW LEVEL SECURITY;

-- RLS policies for project_bidding (users can only access bidding for their own projects)
CREATE POLICY "Users can view project bidding for their projects" ON public.project_bidding
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.projects 
      WHERE projects.id = project_bidding.project_id 
      AND projects.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can create project bidding for their projects" ON public.project_bidding
  FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.projects 
      WHERE projects.id = project_bidding.project_id 
      AND projects.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can update project bidding for their projects" ON public.project_bidding
  FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM public.projects 
      WHERE projects.id = project_bidding.project_id 
      AND projects.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete project bidding for their projects" ON public.project_bidding
  FOR DELETE 
  USING (
    EXISTS (
      SELECT 1 FROM public.projects 
      WHERE projects.id = project_bidding.project_id 
      AND projects.owner_id = auth.uid()
    )
  );

-- Create unique constraint to prevent duplicate bidding entries per project
CREATE UNIQUE INDEX project_bidding_project_cost_code_unique ON public.project_bidding(project_id, cost_code_id);
