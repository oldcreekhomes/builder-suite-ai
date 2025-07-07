-- EMERGENCY FIX: Remove ALL recursive policies and create a simple, working solution

-- Drop the recursive policy I just created 
DROP POLICY IF EXISTS "Employees can view colleagues from same home builder" ON public.employees;

-- Create a security definer function that avoids recursion completely
CREATE OR REPLACE FUNCTION public.get_user_home_builder_id()
RETURNS UUID AS $$
BEGIN
  -- First check if user is a home builder
  IF EXISTS (SELECT 1 FROM public.home_builders WHERE id = auth.uid()) THEN
    RETURN auth.uid();
  END IF;
  
  -- Then check if user is an employee and return their home_builder_id
  RETURN (SELECT home_builder_id FROM public.employees WHERE id = auth.uid() LIMIT 1);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Now create a simple policy using the function
CREATE POLICY "Employees can view all employees from their company" 
ON public.employees FOR SELECT
USING (
  home_builder_id = public.get_user_home_builder_id()
);