-- SIMPLE RLS RULES: Approved employees get access to ALL their home builder's data

-- Drop all existing complex policies and create simple ones

-- PROJECTS TABLE
DROP POLICY IF EXISTS "Simple projects access policy" ON public.projects;
DROP POLICY IF EXISTS "Users can create their own projects" ON public.projects;
DROP POLICY IF EXISTS "Users can update their own projects" ON public.projects;
DROP POLICY IF EXISTS "Users can delete their own projects" ON public.projects;

CREATE POLICY "Home builders and their approved employees can access projects" 
ON public.projects FOR ALL
USING (
  owner_id = auth.uid() 
  OR 
  owner_id IN (
    SELECT home_builder_id FROM employees 
    WHERE id = auth.uid() AND confirmed = true
  )
)
WITH CHECK (
  owner_id = auth.uid() 
  OR 
  owner_id IN (
    SELECT home_builder_id FROM employees 
    WHERE id = auth.uid() AND confirmed = true
  )
);

-- PROJECT FILES TABLE
DROP POLICY IF EXISTS "Users can view files in their projects" ON public.project_files;
DROP POLICY IF EXISTS "Users can upload files to their projects" ON public.project_files;
DROP POLICY IF EXISTS "Users can update files in their projects" ON public.project_files;
DROP POLICY IF EXISTS "Users can delete files in their projects" ON public.project_files;

CREATE POLICY "Home builders and their approved employees can access project files" 
ON public.project_files FOR ALL
USING (
  project_id IN (
    SELECT id FROM projects 
    WHERE owner_id = auth.uid() 
    OR owner_id IN (
      SELECT home_builder_id FROM employees 
      WHERE id = auth.uid() AND confirmed = true
    )
  )
)
WITH CHECK (
  project_id IN (
    SELECT id FROM projects 
    WHERE owner_id = auth.uid() 
    OR owner_id IN (
      SELECT home_builder_id FROM employees 
      WHERE id = auth.uid() AND confirmed = true
    )
  )
);

-- PROJECT PHOTOS TABLE
DROP POLICY IF EXISTS "Users can view photos in their projects" ON public.project_photos;
DROP POLICY IF EXISTS "Users can view photos for accessible projects" ON public.project_photos;
DROP POLICY IF EXISTS "Users can upload photos to their projects" ON public.project_photos;
DROP POLICY IF EXISTS "Users can upload photos to accessible projects" ON public.project_photos;
DROP POLICY IF EXISTS "Users can update photos in their projects" ON public.project_photos;
DROP POLICY IF EXISTS "Users can delete photos in their projects" ON public.project_photos;

CREATE POLICY "Home builders and their approved employees can access project photos" 
ON public.project_photos FOR ALL
USING (
  project_id IN (
    SELECT id FROM projects 
    WHERE owner_id = auth.uid() 
    OR owner_id IN (
      SELECT home_builder_id FROM employees 
      WHERE id = auth.uid() AND confirmed = true
    )
  )
)
WITH CHECK (
  project_id IN (
    SELECT id FROM projects 
    WHERE owner_id = auth.uid() 
    OR owner_id IN (
      SELECT home_builder_id FROM employees 
      WHERE id = auth.uid() AND confirmed = true
    )
  )
);

-- PROJECT BUDGETS TABLE
DROP POLICY IF EXISTS "Users can view budget items for their projects" ON public.project_budgets;
DROP POLICY IF EXISTS "Users can create budget items for their projects" ON public.project_budgets;
DROP POLICY IF EXISTS "Users can update budget items for their projects" ON public.project_budgets;
DROP POLICY IF EXISTS "Users can delete budget items for their projects" ON public.project_budgets;

CREATE POLICY "Home builders and their approved employees can access project budgets" 
ON public.project_budgets FOR ALL
USING (
  project_id IN (
    SELECT id FROM projects 
    WHERE owner_id = auth.uid() 
    OR owner_id IN (
      SELECT home_builder_id FROM employees 
      WHERE id = auth.uid() AND confirmed = true
    )
  )
)
WITH CHECK (
  project_id IN (
    SELECT id FROM projects 
    WHERE owner_id = auth.uid() 
    OR owner_id IN (
      SELECT home_builder_id FROM employees 
      WHERE id = auth.uid() AND confirmed = true
    )
  )
);

-- COMPANIES TABLE
DROP POLICY IF EXISTS "Users can view their own companies" ON public.companies;
DROP POLICY IF EXISTS "Users can create their own companies" ON public.companies;
DROP POLICY IF EXISTS "Users can update their own companies" ON public.companies;
DROP POLICY IF EXISTS "Users can delete their own companies" ON public.companies;

CREATE POLICY "Home builders and their approved employees can access companies" 
ON public.companies FOR ALL
USING (
  owner_id = auth.uid() 
  OR 
  owner_id IN (
    SELECT home_builder_id FROM employees 
    WHERE id = auth.uid() AND confirmed = true
  )
)
WITH CHECK (
  owner_id = auth.uid() 
  OR 
  owner_id IN (
    SELECT home_builder_id FROM employees 
    WHERE id = auth.uid() AND confirmed = true
  )
);

-- COST CODES TABLE
DROP POLICY IF EXISTS "Users can view their own cost codes" ON public.cost_codes;
DROP POLICY IF EXISTS "Users can create their own cost codes" ON public.cost_codes;
DROP POLICY IF EXISTS "Users can update their own cost codes" ON public.cost_codes;
DROP POLICY IF EXISTS "Users can delete their own cost codes" ON public.cost_codes;

CREATE POLICY "Home builders and their approved employees can access cost codes" 
ON public.cost_codes FOR ALL
USING (
  owner_id = auth.uid() 
  OR 
  owner_id IN (
    SELECT home_builder_id FROM employees 
    WHERE id = auth.uid() AND confirmed = true
  )
)
WITH CHECK (
  owner_id = auth.uid() 
  OR 
  owner_id IN (
    SELECT home_builder_id FROM employees 
    WHERE id = auth.uid() AND confirmed = true
  )
);