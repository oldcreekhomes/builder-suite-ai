-- Update employees RLS policy to allow employees to see other employees from the same home builder
DROP POLICY IF EXISTS "Employees can view their own record" ON public.employees;

-- Create new policy for employees to see all employees under the same home builder
CREATE POLICY "Employees can view employees from same home builder" 
ON public.employees FOR SELECT
USING (
  home_builder_id = auth.uid() 
  OR 
  home_builder_id IN (
    SELECT home_builder_id FROM employees 
    WHERE id = auth.uid() AND confirmed = true
  )
);