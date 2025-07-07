-- SIMPLE AND SAFE: Just update the existing policy to allow employees to see colleagues
-- First drop the current "employees can view their own record" policy
DROP POLICY IF EXISTS "Employees can view their own record" ON public.employees;

-- Create a simple security definer function to get user's home_builder_id
CREATE OR REPLACE FUNCTION public.get_current_user_home_builder_id()
RETURNS UUID AS $$
BEGIN
  -- Check if current user is in employees table and return their home_builder_id
  RETURN (SELECT home_builder_id FROM public.employees WHERE id = auth.uid() LIMIT 1);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Now create an updated policy that lets employees see all employees from their company
CREATE POLICY "Employees can view all company employees" 
ON public.employees FOR SELECT
USING (
  id = auth.uid() 
  OR 
  home_builder_id = public.get_current_user_home_builder_id()
);