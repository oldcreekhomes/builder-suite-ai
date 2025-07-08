-- Fix infinite recursion in employees table policies
-- The issue is policies on employees table that reference employees table

-- Drop ALL existing policies on employees table
DROP POLICY IF EXISTS "Employees access policy" ON public.employees;
DROP POLICY IF EXISTS "Company employees access" ON public.employees;
DROP POLICY IF EXISTS "Employees can view their own record" ON public.employees;
DROP POLICY IF EXISTS "Employees can update their own record" ON public.employees;
DROP POLICY IF EXISTS "Home builders and their approved employees can access employees" ON public.employees;

-- Create simple, non-recursive policies
CREATE POLICY "Home builders can access their employees" 
ON public.employees 
FOR ALL 
USING (home_builder_id = auth.uid())
WITH CHECK (home_builder_id = auth.uid());

CREATE POLICY "Employees can access their own record" 
ON public.employees 
FOR ALL 
USING (id = auth.uid())
WITH CHECK (id = auth.uid());