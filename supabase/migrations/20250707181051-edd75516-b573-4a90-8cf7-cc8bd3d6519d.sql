-- Drop all existing policies on employees table
DROP POLICY IF EXISTS "Home builders can manage their employees" ON public.employees;
DROP POLICY IF EXISTS "Employees can view their own record" ON public.employees;
DROP POLICY IF EXISTS "Employees can view colleagues from same home builder" ON public.employees;

-- Create security definer function to get home builder ID for an employee
CREATE OR REPLACE FUNCTION public.get_employee_home_builder_id(employee_id UUID)
RETURNS UUID AS $$
  SELECT home_builder_id FROM public.employees WHERE id = employee_id LIMIT 1;
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Recreate the policies without recursion
CREATE POLICY "Home builders can manage their employees" 
ON public.employees FOR ALL
USING (home_builder_id = auth.uid())
WITH CHECK (home_builder_id = auth.uid());

CREATE POLICY "Employees can view their own record" 
ON public.employees FOR SELECT
USING (id = auth.uid());

CREATE POLICY "Employees can view colleagues from same home builder" 
ON public.employees FOR SELECT
USING (
  home_builder_id = public.get_employee_home_builder_id(auth.uid())
);