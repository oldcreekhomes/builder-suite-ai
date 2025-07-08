-- Remove the problematic policy I just added
DROP POLICY IF EXISTS "Employees can view coworkers in same company" ON public.employees;

-- Replace the existing restrictive policies with one comprehensive policy
DROP POLICY IF EXISTS "Employees can access their own record" ON public.employees;
DROP POLICY IF EXISTS "Home builders can access their employees" ON public.employees;

-- Create one simple, working policy for all employee access
CREATE POLICY "All employee access" 
ON public.employees 
FOR ALL 
USING (
  -- Home builders can access their employees
  (home_builder_id = auth.uid()) OR 
  -- Employees can access their own record and see other employees in same company
  (id = auth.uid()) OR
  (EXISTS (
    SELECT 1 FROM public.employees emp 
    WHERE emp.id = auth.uid() 
    AND emp.confirmed = true 
    AND emp.home_builder_id = employees.home_builder_id
  ))
) 
WITH CHECK (
  -- Home builders can modify their employees
  (home_builder_id = auth.uid()) OR 
  -- Employees can modify their own record
  (id = auth.uid())
);