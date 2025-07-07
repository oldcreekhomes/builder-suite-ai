-- Update RLS policies to give employees automatic access to their company's data
-- This allows employees to see all data that their home_builder_id owner can see

-- Update projects policy to include employees
DROP POLICY IF EXISTS "Users can view projects they own or are assigned to" ON public.projects;
CREATE POLICY "Users can view projects they own or are assigned to" 
ON public.projects 
FOR SELECT 
USING (
  owner_id = auth.uid() 
  OR 
  owner_id IN (
    SELECT home_builder_id 
    FROM employees 
    WHERE id = auth.uid() AND confirmed = true
  )
);

-- Update project_files policies to include employees
DROP POLICY IF EXISTS "Users can view files in their projects" ON public.project_files;
DROP POLICY IF EXISTS "Users can upload files to their projects" ON public.project_files;
DROP POLICY IF EXISTS "Users can update files in their projects" ON public.project_files;
DROP POLICY IF EXISTS "Users can delete files in their projects" ON public.project_files;

CREATE POLICY "Users can view files in their projects" 
ON public.project_files 
FOR SELECT 
USING (
  project_id IN (
    SELECT id FROM projects 
    WHERE owner_id = auth.uid() 
    OR owner_id IN (
      SELECT home_builder_id 
      FROM employees 
      WHERE id = auth.uid() AND confirmed = true
    )
  )
);

CREATE POLICY "Users can upload files to their projects" 
ON public.project_files 
FOR INSERT 
WITH CHECK (
  auth.uid() = uploaded_by 
  AND project_id IN (
    SELECT id FROM projects 
    WHERE owner_id = auth.uid() 
    OR owner_id IN (
      SELECT home_builder_id 
      FROM employees 
      WHERE id = auth.uid() AND confirmed = true
    )
  )
);

CREATE POLICY "Users can update files in their projects" 
ON public.project_files 
FOR UPDATE 
USING (
  project_id IN (
    SELECT id FROM projects 
    WHERE owner_id = auth.uid() 
    OR owner_id IN (
      SELECT home_builder_id 
      FROM employees 
      WHERE id = auth.uid() AND confirmed = true
    )
  )
);

CREATE POLICY "Users can delete files in their projects" 
ON public.project_files 
FOR DELETE 
USING (
  project_id IN (
    SELECT id FROM projects 
    WHERE owner_id = auth.uid() 
    OR owner_id IN (
      SELECT home_builder_id 
      FROM employees 
      WHERE id = auth.uid() AND confirmed = true
    )
  )
);

-- Update project_photos policies to include employees
DROP POLICY IF EXISTS "Users can view photos in their projects" ON public.project_photos;
DROP POLICY IF EXISTS "Users can view photos for accessible projects" ON public.project_photos;
DROP POLICY IF EXISTS "Users can upload photos to their projects" ON public.project_photos;
DROP POLICY IF EXISTS "Users can upload photos to accessible projects" ON public.project_photos;
DROP POLICY IF EXISTS "Users can update photos in their projects" ON public.project_photos;
DROP POLICY IF EXISTS "Users can delete photos in their projects" ON public.project_photos;

CREATE POLICY "Users can view photos in their projects" 
ON public.project_photos 
FOR SELECT 
USING (
  project_id IN (
    SELECT id FROM projects 
    WHERE owner_id = auth.uid() 
    OR owner_id IN (
      SELECT home_builder_id 
      FROM employees 
      WHERE id = auth.uid() AND confirmed = true
    )
  )
);

CREATE POLICY "Users can upload photos to their projects" 
ON public.project_photos 
FOR INSERT 
WITH CHECK (
  uploaded_by = auth.uid() 
  AND project_id IN (
    SELECT id FROM projects 
    WHERE owner_id = auth.uid() 
    OR owner_id IN (
      SELECT home_builder_id 
      FROM employees 
      WHERE id = auth.uid() AND confirmed = true
    )
  )
);

CREATE POLICY "Users can update photos in their projects" 
ON public.project_photos 
FOR UPDATE 
USING (
  project_id IN (
    SELECT id FROM projects 
    WHERE owner_id = auth.uid() 
    OR owner_id IN (
      SELECT home_builder_id 
      FROM employees 
      WHERE id = auth.uid() AND confirmed = true
    )
  )
);

CREATE POLICY "Users can delete photos in their projects" 
ON public.project_photos 
FOR DELETE 
USING (
  project_id IN (
    SELECT id FROM projects 
    WHERE owner_id = auth.uid() 
    OR owner_id IN (
      SELECT home_builder_id 
      FROM employees 
      WHERE id = auth.uid() AND confirmed = true
    )
  )
);