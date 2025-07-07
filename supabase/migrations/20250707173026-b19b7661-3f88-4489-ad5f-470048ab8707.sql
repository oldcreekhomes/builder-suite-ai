-- Temporarily simplify the projects RLS policy to debug the issue
-- Replace the complex policy with a simple one

DROP POLICY IF EXISTS "Users can view projects they own or are assigned to" ON public.projects;

-- Create a simpler policy that should definitely work for employees
CREATE POLICY "Simple projects access policy" 
ON public.projects 
FOR SELECT 
USING (
  -- Home builders can see their own projects
  owner_id = auth.uid()
  OR 
  -- Employees can see projects owned by their home builder
  EXISTS (
    SELECT 1 FROM employees 
    WHERE employees.id = auth.uid() 
    AND employees.home_builder_id = projects.owner_id
    AND employees.confirmed = true
  )
);