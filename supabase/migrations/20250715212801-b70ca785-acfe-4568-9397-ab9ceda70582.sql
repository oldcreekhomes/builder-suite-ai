-- Fix the get_current_user_company function to work for both owners and employees
CREATE OR REPLACE FUNCTION public.get_current_user_company()
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
  SELECT CASE 
    WHEN u.role = 'owner' THEN u.company_name
    WHEN u.role = 'employee' THEN (
      SELECT owner.company_name 
      FROM public.users owner 
      WHERE owner.id = u.home_builder_id
    )
    ELSE NULL
  END
  FROM public.users u 
  WHERE u.id = auth.uid();
$$;