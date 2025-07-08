-- Remove the problematic policy
DROP POLICY IF EXISTS "All employee access" ON public.employees;

-- Create two simple, separate policies that work
CREATE POLICY "Home builders can manage their employees" 
ON public.employees 
FOR ALL 
USING (home_builder_id = auth.uid())
WITH CHECK (home_builder_id = auth.uid());

CREATE POLICY "Employees can access employee records" 
ON public.employees 
FOR SELECT 
USING (
  -- Employees can see their own record
  id = auth.uid() 
  OR 
  -- Employees can see other records in their company (non-recursive way)
  home_builder_id = (
    SELECT home_builder_id 
    FROM public.employees 
    WHERE id = auth.uid() 
    AND confirmed = true
    LIMIT 1
  )
);

CREATE POLICY "Employees can update their own record" 
ON public.employees 
FOR UPDATE 
USING (id = auth.uid())
WITH CHECK (id = auth.uid());