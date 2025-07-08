-- The problem might be with the recursive policy structure
-- Let's create a much simpler, direct policy that should work
DROP POLICY IF EXISTS "Company employees access" ON public.employees;

-- Create a straightforward policy that explicitly handles both cases
CREATE POLICY "Employees access policy" 
ON public.employees 
FOR ALL 
USING (
  -- Home builders can access their employees
  (home_builder_id = auth.uid()) OR 
  -- Employees can access their own record
  (id = auth.uid()) OR
  -- Employees can access other employees in their company (non-recursive way)
  (home_builder_id IN (
    SELECT DISTINCT e.home_builder_id 
    FROM public.employees e 
    WHERE e.id = auth.uid() AND e.confirmed = true
  ))
) 
WITH CHECK (
  -- Home builders can modify their employees
  (home_builder_id = auth.uid()) OR 
  -- Employees can modify their own record
  (id = auth.uid())
);