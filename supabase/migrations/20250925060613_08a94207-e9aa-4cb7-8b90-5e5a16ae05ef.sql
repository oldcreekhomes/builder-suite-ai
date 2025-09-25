-- Drop and recreate the get_home_builders function to include email
DROP FUNCTION IF EXISTS public.get_home_builders();

CREATE FUNCTION public.get_home_builders()
 RETURNS TABLE(id uuid, company_name text, email text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
  RETURN QUERY
  SELECT u.id, u.company_name, u.email
  FROM public.users u
  WHERE u.role = 'owner' AND u.company_name IS NOT NULL;
END;
$function$;