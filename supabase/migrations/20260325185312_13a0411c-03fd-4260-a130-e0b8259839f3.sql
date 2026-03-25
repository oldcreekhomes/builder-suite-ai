
-- Table: project_folder_locks
CREATE TABLE public.project_folder_locks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  folder_path text NOT NULL,
  locked_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(project_id, folder_path)
);

ALTER TABLE public.project_folder_locks ENABLE ROW LEVEL SECURITY;

-- Owners can do everything
CREATE POLICY "Owners can manage folder locks"
ON public.project_folder_locks
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = project_folder_locks.project_id
    AND p.owner_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = project_folder_locks.project_id
    AND p.owner_id = auth.uid()
  )
);

-- Employees can read locks (to know which folders are locked)
CREATE POLICY "Employees can read folder locks"
ON public.project_folder_locks
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.projects p
    JOIN public.users u ON u.home_builder_id = p.owner_id
    WHERE p.id = project_folder_locks.project_id
    AND u.id = auth.uid()
    AND u.confirmed = true
  )
);

-- Table: project_folder_access_grants
CREATE TABLE public.project_folder_access_grants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  folder_path text NOT NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  granted_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(project_id, folder_path, user_id)
);

ALTER TABLE public.project_folder_access_grants ENABLE ROW LEVEL SECURITY;

-- Owners can manage all grants
CREATE POLICY "Owners can manage folder access grants"
ON public.project_folder_access_grants
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = project_folder_access_grants.project_id
    AND p.owner_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = project_folder_access_grants.project_id
    AND p.owner_id = auth.uid()
  )
);

-- Users can read their own grants
CREATE POLICY "Users can read own folder access grants"
ON public.project_folder_access_grants
FOR SELECT
TO authenticated
USING (user_id = auth.uid());
