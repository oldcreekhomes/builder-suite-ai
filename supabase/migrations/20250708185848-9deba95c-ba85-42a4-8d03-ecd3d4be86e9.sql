-- Drop the inconsistent employee policies
DROP POLICY IF EXISTS "Employees can view all company employees" ON public.employees;
DROP POLICY IF EXISTS "Home builders can manage their employees" ON public.employees;

-- Create consistent RLS policies for employees table that match all other tables
CREATE POLICY "Home builders and their approved employees can access employees" 
ON public.employees 
FOR ALL 
USING (
  (home_builder_id = auth.uid()) OR 
  (home_builder_id IN ( 
    SELECT employees.home_builder_id
    FROM employees
    WHERE ((employees.id = auth.uid()) AND (employees.confirmed = true))
  ))
) 
WITH CHECK (
  (home_builder_id = auth.uid()) OR 
  (home_builder_id IN ( 
    SELECT employees.home_builder_id
    FROM employees
    WHERE ((employees.id = auth.uid()) AND (employees.confirmed = true))
  ))
);

-- Also ensure all employees can view their own record
CREATE POLICY "Employees can view their own record" 
ON public.employees 
FOR SELECT 
USING (id = auth.uid());

-- Ensure all employees can update their own record  
CREATE POLICY "Employees can update their own record" 
ON public.employees 
FOR UPDATE 
USING (id = auth.uid())
WITH CHECK (id = auth.uid());