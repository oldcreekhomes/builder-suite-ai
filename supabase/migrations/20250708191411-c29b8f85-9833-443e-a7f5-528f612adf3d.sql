-- Test if we can directly access the employee data to debug the function
-- First, let's check what auth.uid() returns
CREATE OR REPLACE FUNCTION public.debug_auth_uid()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN auth.uid();
END;
$$;

-- Check if the function can see employee data
CREATE OR REPLACE FUNCTION public.debug_employee_access()
RETURNS TABLE(employee_id uuid, home_builder_id uuid, confirmed boolean)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT id, e.home_builder_id, e.confirmed
  FROM public.employees e
  WHERE e.id = auth.uid();
END;
$$;