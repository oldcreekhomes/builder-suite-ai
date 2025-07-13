-- Update RLS policies that reference old tables
-- We need to update policies on other tables that reference owners/employees

-- Update projects RLS policies to use the new users table
DROP POLICY IF EXISTS "Projects access policy" ON public.projects;

CREATE POLICY "Projects access policy" 
  ON public.projects 
  FOR ALL 
  USING (
    (owner_id = auth.uid()) OR 
    (owner_id IN (
      SELECT home_builder_id 
      FROM public.users 
      WHERE id = auth.uid() 
        AND role = 'employee' 
        AND confirmed = true
    ))
  )
  WITH CHECK (
    (owner_id = auth.uid()) OR 
    (owner_id IN (
      SELECT home_builder_id 
      FROM public.users 
      WHERE id = auth.uid() 
        AND role = 'employee' 
        AND confirmed = true
    ))
  );

-- Update get_current_user_home_builder_id function to avoid infinite recursion
DROP FUNCTION IF EXISTS public.get_current_user_home_builder_id();

CREATE OR REPLACE FUNCTION public.get_current_user_home_builder_id()
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
  SELECT home_builder_id 
  FROM public.users 
  WHERE id = auth.uid() 
    AND role = 'employee' 
    AND confirmed = true
  LIMIT 1;
$$;