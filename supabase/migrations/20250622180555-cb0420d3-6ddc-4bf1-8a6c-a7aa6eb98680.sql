
-- Create function to get pending employee approvals for home builders
CREATE OR REPLACE FUNCTION public.get_pending_employee_approvals()
RETURNS TABLE(
  id uuid,
  email text,
  company_name text,
  created_at timestamp with time zone
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.email,
    hb.company_name,
    p.created_at
  FROM public.profiles p
  JOIN public.profiles hb ON p.home_builder_id = hb.id
  WHERE p.user_type = 'employee' 
    AND p.approved_by_home_builder = false
    AND hb.id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to approve employee
CREATE OR REPLACE FUNCTION public.approve_employee(employee_id uuid)
RETURNS void AS $$
BEGIN
  -- Check if the current user is the home builder for this employee
  IF EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = employee_id 
      AND home_builder_id = auth.uid()
      AND user_type = 'employee'
  ) THEN
    UPDATE public.profiles 
    SET approved_by_home_builder = true,
        updated_at = NOW()
    WHERE id = employee_id;
  ELSE
    RAISE EXCEPTION 'Unauthorized: You can only approve your own employees';
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
