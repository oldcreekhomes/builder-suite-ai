-- Drop the problematic recursive policy
DROP POLICY IF EXISTS "Home builders and their approved employees can access employees" ON public.employees;

-- Drop the redundant policies since we'll create a comprehensive one
DROP POLICY IF EXISTS "Employees can view their own record" ON public.employees;
DROP POLICY IF EXISTS "Employees can update their own record" ON public.employees;

-- Create a single, comprehensive policy for employees that avoids recursion
CREATE POLICY "Employees access policy" 
ON public.employees 
FOR ALL 
USING (
  -- Home builders can access their employees
  (home_builder_id = auth.uid()) OR 
  -- Employees can access their own record
  (id = auth.uid()) OR
  -- Approved employees can access other employees in same company
  (home_builder_id = get_current_user_home_builder_id())
) 
WITH CHECK (
  -- Home builders can modify their employees
  (home_builder_id = auth.uid()) OR 
  -- Employees can modify their own record
  (id = auth.uid()) OR
  -- Approved employees can modify employees in same company (for admin functions)
  (home_builder_id = get_current_user_home_builder_id())
);