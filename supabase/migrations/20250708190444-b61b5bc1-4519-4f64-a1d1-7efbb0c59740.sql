-- Fix the get_current_user_home_builder_id function to work properly
CREATE OR REPLACE FUNCTION public.get_current_user_home_builder_id()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  home_builder_id_result UUID;
BEGIN
  -- Check if current user is an employee and return their home_builder_id
  SELECT home_builder_id INTO home_builder_id_result
  FROM public.employees 
  WHERE id = auth.uid() 
  AND confirmed = true
  LIMIT 1;
  
  RETURN home_builder_id_result;
END;
$$;

-- Now recreate the employees policy with a simpler, non-recursive approach
DROP POLICY IF EXISTS "Employees access policy" ON public.employees;

-- Create a comprehensive policy that works for all cases
CREATE POLICY "Company employees access" 
ON public.employees 
FOR ALL 
USING (
  -- Home builders can access their employees
  (home_builder_id = auth.uid()) OR 
  -- Employees can access their own record
  (id = auth.uid()) OR
  -- Employees can access other employees in their company
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