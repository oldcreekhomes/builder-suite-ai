-- Clean up debug functions
DROP FUNCTION IF EXISTS public.debug_auth_uid();
DROP FUNCTION IF EXISTS public.debug_employee_access();

-- The issue is that auth.uid() might not be working in all contexts
-- Let's fix the get_current_user_home_builder_id function to be more robust
CREATE OR REPLACE FUNCTION public.get_current_user_home_builder_id()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  home_builder_id_result UUID;
  current_user_id UUID;
BEGIN
  -- Get the current user ID
  current_user_id := auth.uid();
  
  -- If auth.uid() returns null, we can't proceed
  IF current_user_id IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Check if current user is an employee and return their home_builder_id
  SELECT home_builder_id INTO home_builder_id_result
  FROM public.employees 
  WHERE id = current_user_id 
  AND confirmed = true
  LIMIT 1;
  
  RETURN home_builder_id_result;
END;
$$;