-- Fix infinite recursion in RLS policies by creating a security definer function
-- and updating the policies to use it

-- First drop the problematic policies
DROP POLICY IF EXISTS "Employees can view company users" ON public.users;

-- Create a security definer function to get user role without recursion
CREATE OR REPLACE FUNCTION public.get_user_role_and_home_builder(user_id uuid)
RETURNS TABLE(role text, home_builder_id uuid)
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
  SELECT u.role, u.home_builder_id
  FROM public.users u
  WHERE u.id = user_id;
$$;

-- Recreate the policy using the security definer function
CREATE POLICY "Employees can view company users" 
  ON public.users 
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 
      FROM public.get_user_role_and_home_builder(auth.uid()) AS current_user
      WHERE current_user.role = 'employee' 
        AND current_user.home_builder_id = users.home_builder_id
        AND users.confirmed = true
    )
  );