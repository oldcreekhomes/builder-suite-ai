
-- Create project_account_exclusions table
CREATE TABLE public.project_account_exclusions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(project_id, account_id)
);

-- Enable RLS
ALTER TABLE public.project_account_exclusions ENABLE ROW LEVEL SECURITY;

-- RLS policies matching the projects table access pattern (owner_id based)
CREATE POLICY "Users can view exclusions for their projects"
ON public.project_account_exclusions
FOR SELECT
USING (
  project_id IN (
    SELECT id FROM public.projects WHERE owner_id = auth.uid()
  )
  OR
  project_id IN (
    SELECT id FROM public.projects WHERE owner_id = (
      SELECT home_builder_id FROM public.users WHERE id = auth.uid() AND role = 'employee' AND confirmed = true
    )
  )
);

CREATE POLICY "Users can insert exclusions for their projects"
ON public.project_account_exclusions
FOR INSERT
WITH CHECK (
  project_id IN (
    SELECT id FROM public.projects WHERE owner_id = auth.uid()
  )
  OR
  project_id IN (
    SELECT id FROM public.projects WHERE owner_id = (
      SELECT home_builder_id FROM public.users WHERE id = auth.uid() AND role = 'employee' AND confirmed = true
    )
  )
);

CREATE POLICY "Users can delete exclusions for their projects"
ON public.project_account_exclusions
FOR DELETE
USING (
  project_id IN (
    SELECT id FROM public.projects WHERE owner_id = auth.uid()
  )
  OR
  project_id IN (
    SELECT id FROM public.projects WHERE owner_id = (
      SELECT home_builder_id FROM public.users WHERE id = auth.uid() AND role = 'employee' AND confirmed = true
    )
  )
);
