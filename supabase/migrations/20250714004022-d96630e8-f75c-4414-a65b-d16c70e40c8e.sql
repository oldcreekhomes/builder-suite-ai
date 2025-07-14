-- Drop the problematic policy that's causing infinite recursion
DROP POLICY IF EXISTS "Employees can view their home builder" ON public.users;

-- Create a security definer function to check if current user is an employee with a home builder
CREATE OR REPLACE FUNCTION public.get_current_user_home_builder_info()
RETURNS TABLE(is_employee boolean, home_builder_id uuid)
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT 
    (role = 'employee' AND confirmed = true) as is_employee,
    home_builder_id
  FROM public.users 
  WHERE id = auth.uid()
  LIMIT 1;
$$;

-- Recreate the policy using the security definer function
CREATE POLICY "Employees can view their home builder" 
ON public.users 
FOR SELECT 
USING (
  -- Allow employees to see their home builder (owner)
  role = 'owner' AND EXISTS (
    SELECT 1 FROM public.get_current_user_home_builder_info() info
    WHERE info.is_employee = true AND info.home_builder_id = users.id
  )
);