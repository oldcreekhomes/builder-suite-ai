-- URGENT: Revert back to the original working RLS policies for employees

-- Drop the broken policies I created
DROP POLICY IF EXISTS "Home builders can manage their employees" ON public.employees;
DROP POLICY IF EXISTS "Employees can view their own record" ON public.employees;
DROP POLICY IF EXISTS "Employees can view colleagues from same home builder" ON public.employees;
DROP FUNCTION IF EXISTS public.get_employee_home_builder_id(UUID);

-- Restore the ORIGINAL working policies from the migration file
CREATE POLICY "Home builders can manage their employees" 
ON public.employees FOR ALL
USING (home_builder_id = auth.uid())
WITH CHECK (home_builder_id = auth.uid());

CREATE POLICY "Employees can view their own record" 
ON public.employees FOR SELECT
USING (id = auth.uid());