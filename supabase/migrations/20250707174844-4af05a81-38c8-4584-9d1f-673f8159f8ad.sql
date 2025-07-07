-- Fix employees RLS policy to allow employees to see their own records
DROP POLICY IF EXISTS "Home builders can manage their employees" ON public.employees;
DROP POLICY IF EXISTS "Employees can view their own record" ON public.employees;

-- Home builders can manage their employees
CREATE POLICY "Home builders can manage their employees" 
ON public.employees FOR ALL
USING (home_builder_id = auth.uid())
WITH CHECK (home_builder_id = auth.uid());

-- Employees can view their own record 
CREATE POLICY "Employees can view their own record" 
ON public.employees FOR SELECT
USING (id = auth.uid());