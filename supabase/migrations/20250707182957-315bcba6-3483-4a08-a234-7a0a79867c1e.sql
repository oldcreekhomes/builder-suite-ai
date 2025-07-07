-- SIMPLE SOLUTION: Make employees table work like all the other tables

-- Drop all the complex stuff I created
DROP POLICY IF EXISTS "Employees can view all employees from their company" ON public.employees;
DROP FUNCTION IF EXISTS public.get_user_home_builder_id();

-- Add the SAME simple pattern that works for projects, companies, cost_codes, etc.
CREATE POLICY "Employees can view all employees from their company" 
ON public.employees FOR SELECT
USING (
  home_builder_id = auth.uid() 
  OR 
  home_builder_id IN (
    SELECT e.home_builder_id FROM public.employees e 
    WHERE e.id = auth.uid() AND e.confirmed = true
  )
);