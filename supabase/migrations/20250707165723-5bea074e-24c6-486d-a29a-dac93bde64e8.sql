-- Update RLS policies to work with the new employees table structure

-- Drop the old project policy that only checks profiles table
DROP POLICY IF EXISTS "Users can view projects they own or are assigned to" ON public.projects;

-- Create new policy that checks both profiles (for home builders) and employees table (for employees)
CREATE POLICY "Users can view projects they own or are assigned to" 
ON public.projects 
FOR SELECT 
USING (
  -- Home builders can see their own projects
  owner_id = auth.uid() 
  OR 
  -- Employees can see their home builder's projects
  owner_id IN (
    SELECT home_builder_id 
    FROM public.employees 
    WHERE id = auth.uid() AND confirmed = true
  )
);

-- Also update other tables that might have similar issues
-- Update project_photos policy
DROP POLICY IF EXISTS "Users can view photos for accessible projects" ON public.project_photos;
CREATE POLICY "Users can view photos for accessible projects" 
ON public.project_photos 
FOR SELECT 
USING (
  project_id IN (
    SELECT id FROM public.projects 
    WHERE owner_id = auth.uid() 
    OR owner_id IN (
      SELECT home_builder_id 
      FROM public.employees 
      WHERE id = auth.uid() AND confirmed = true
    )
  )
);

-- Update project_photos insert policy for employees
DROP POLICY IF EXISTS "Users can upload photos to accessible projects" ON public.project_photos;
CREATE POLICY "Users can upload photos to accessible projects" 
ON public.project_photos 
FOR INSERT 
WITH CHECK (
  uploaded_by = auth.uid() 
  AND project_id IN (
    SELECT id FROM public.projects 
    WHERE owner_id = auth.uid() 
    OR owner_id IN (
      SELECT home_builder_id 
      FROM public.employees 
      WHERE id = auth.uid() AND confirmed = true
    )
  )
);

-- Update project_files policies for employees
DROP POLICY IF EXISTS "Users can view files in their projects" ON public.project_files;
CREATE POLICY "Users can view files in their projects" 
ON public.project_files 
FOR SELECT 
USING (
  project_id IN (
    SELECT id FROM public.projects 
    WHERE owner_id = auth.uid() 
    OR owner_id IN (
      SELECT home_builder_id 
      FROM public.employees 
      WHERE id = auth.uid() AND confirmed = true
    )
  )
);

DROP POLICY IF EXISTS "Users can upload files to their projects" ON public.project_files;
CREATE POLICY "Users can upload files to their projects" 
ON public.project_files 
FOR INSERT 
WITH CHECK (
  auth.uid() = uploaded_by 
  AND project_id IN (
    SELECT id FROM public.projects 
    WHERE owner_id = auth.uid() 
    OR owner_id IN (
      SELECT home_builder_id 
      FROM public.employees 
      WHERE id = auth.uid() AND confirmed = true
    )
  )
);

DROP POLICY IF EXISTS "Users can update files in their projects" ON public.project_files;
CREATE POLICY "Users can update files in their projects" 
ON public.project_files 
FOR UPDATE 
USING (
  project_id IN (
    SELECT id FROM public.projects 
    WHERE owner_id = auth.uid() 
    OR owner_id IN (
      SELECT home_builder_id 
      FROM public.employees 
      WHERE id = auth.uid() AND confirmed = true
    )
  )
);

DROP POLICY IF EXISTS "Users can delete files in their projects" ON public.project_files;
CREATE POLICY "Users can delete files in their projects" 
ON public.project_files 
FOR DELETE 
USING (
  project_id IN (
    SELECT id FROM public.projects 
    WHERE owner_id = auth.uid() 
    OR owner_id IN (
      SELECT home_builder_id 
      FROM public.employees 
      WHERE id = auth.uid() AND confirmed = true
    )
  )
);