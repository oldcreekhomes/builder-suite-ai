-- Update projects policy to use direct approach instead of function
DROP POLICY IF EXISTS "Home builders and their approved employees can access projects" ON public.projects;

CREATE POLICY "Projects access policy" 
ON public.projects 
FOR ALL 
USING (
  -- Home builders can access their own projects
  (owner_id = auth.uid()) OR 
  -- Employees can access projects from their home builder
  (owner_id IN (
    SELECT DISTINCT e.home_builder_id 
    FROM public.employees e 
    WHERE e.id = auth.uid() AND e.confirmed = true
  ))
) 
WITH CHECK (
  -- Home builders can modify their own projects
  (owner_id = auth.uid()) OR 
  -- Employees can modify projects from their home builder
  (owner_id IN (
    SELECT DISTINCT e.home_builder_id 
    FROM public.employees e 
    WHERE e.id = auth.uid() AND e.confirmed = true
  ))
);