-- Create security definer function to get current user's company
CREATE OR REPLACE FUNCTION public.get_current_user_company()
RETURNS TEXT AS $$
  SELECT company_name FROM public.users WHERE id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Drop existing RLS policies
DROP POLICY IF EXISTS "Projects access policy" ON public.projects;
DROP POLICY IF EXISTS "Users can view files from their projects" ON public.project_files;
DROP POLICY IF EXISTS "Users can upload files to their projects" ON public.project_files;
DROP POLICY IF EXISTS "Users can update files in their projects" ON public.project_files;
DROP POLICY IF EXISTS "Users can delete files from their projects" ON public.project_files;
DROP POLICY IF EXISTS "Users can view photos from their projects" ON public.project_photos;
DROP POLICY IF EXISTS "Users can insert photos to their projects" ON public.project_photos;
DROP POLICY IF EXISTS "Users can update photos in their projects" ON public.project_photos;
DROP POLICY IF EXISTS "Users can delete photos from their projects" ON public.project_photos;

-- Enable RLS on tables that might not have it enabled
ALTER TABLE public.project_budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_schedule_tasks ENABLE ROW LEVEL SECURITY;

-- Create company-based RLS policies for projects
CREATE POLICY "Company users can access all company projects" ON public.projects
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.users project_owner 
    WHERE project_owner.id = projects.owner_id 
    AND project_owner.company_name = public.get_current_user_company()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.users project_owner 
    WHERE project_owner.id = projects.owner_id 
    AND project_owner.company_name = public.get_current_user_company()
  )
);

-- Create company-based RLS policies for project_files
CREATE POLICY "Company users can access all company project files" ON public.project_files
FOR ALL
USING (
  project_id IN (
    SELECT p.id FROM public.projects p
    JOIN public.users project_owner ON project_owner.id = p.owner_id
    WHERE project_owner.company_name = public.get_current_user_company()
  )
)
WITH CHECK (
  project_id IN (
    SELECT p.id FROM public.projects p
    JOIN public.users project_owner ON project_owner.id = p.owner_id
    WHERE project_owner.company_name = public.get_current_user_company()
  )
);

-- Create company-based RLS policies for project_photos
CREATE POLICY "Company users can access all company project photos" ON public.project_photos
FOR ALL
USING (
  project_id IN (
    SELECT p.id FROM public.projects p
    JOIN public.users project_owner ON project_owner.id = p.owner_id
    WHERE project_owner.company_name = public.get_current_user_company()
  )
)
WITH CHECK (
  project_id IN (
    SELECT p.id FROM public.projects p
    JOIN public.users project_owner ON project_owner.id = p.owner_id
    WHERE project_owner.company_name = public.get_current_user_company()
  )
);

-- Create company-based RLS policies for project_budgets
CREATE POLICY "Company users can access all company project budgets" ON public.project_budgets
FOR ALL
USING (
  project_id IN (
    SELECT p.id FROM public.projects p
    JOIN public.users project_owner ON project_owner.id = p.owner_id
    WHERE project_owner.company_name = public.get_current_user_company()
  )
)
WITH CHECK (
  project_id IN (
    SELECT p.id FROM public.projects p
    JOIN public.users project_owner ON project_owner.id = p.owner_id
    WHERE project_owner.company_name = public.get_current_user_company()
  )
);

-- Create company-based RLS policies for project_schedule_tasks
CREATE POLICY "Company users can access all company project schedule tasks" ON public.project_schedule_tasks
FOR ALL
USING (
  project_id IN (
    SELECT p.id FROM public.projects p
    JOIN public.users project_owner ON project_owner.id = p.owner_id
    WHERE project_owner.company_name = public.get_current_user_company()
  )
)
WITH CHECK (
  project_id IN (
    SELECT p.id FROM public.projects p
    JOIN public.users project_owner ON project_owner.id = p.owner_id
    WHERE project_owner.company_name = public.get_current_user_company()
  )
);