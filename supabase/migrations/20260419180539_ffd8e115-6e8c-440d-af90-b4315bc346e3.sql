DROP FUNCTION IF EXISTS public.admin_get_platform_overview();

CREATE OR REPLACE FUNCTION public.admin_get_platform_overview()
RETURNS TABLE(
  total_builder_companies bigint,
  total_builder_users bigint,
  total_subcontractors bigint,
  signups_7d bigint,
  signups_30d bigint,
  active_7d bigint,
  active_30d bigint,
  builder_users_source text,
  subcontractors_source text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'platform_admin') THEN
    RAISE EXCEPTION 'Access denied: platform_admin role required';
  END IF;

  RETURN QUERY
  WITH builder_owners AS (
    SELECT id
    FROM public.users
    WHERE user_type = 'home_builder' AND role = 'owner'
  )
  SELECT
    (SELECT count(*) FROM public.admin_get_builder_health())::bigint AS total_builder_companies,
    (
      SELECT count(DISTINCT u.id)
      FROM public.users u
      WHERE u.id IN (SELECT id FROM builder_owners)
         OR u.home_builder_id IN (SELECT id FROM builder_owners)
    )::bigint AS total_builder_users,
    (
      SELECT count(*)
      FROM public.users
      WHERE user_type = 'marketplace_vendor'
    )::bigint AS total_subcontractors,
    (
      SELECT count(*)
      FROM public.users
      WHERE created_at >= now() - interval '7 days'
    )::bigint AS signups_7d,
    (
      SELECT count(*)
      FROM public.users
      WHERE created_at >= now() - interval '30 days'
    )::bigint AS signups_30d,
    (
      SELECT count(DISTINCT au.id)
      FROM auth.users au
      WHERE au.last_sign_in_at >= now() - interval '7 days'
    )::bigint AS active_7d,
    (
      SELECT count(DISTINCT au.id)
      FROM auth.users au
      WHERE au.last_sign_in_at >= now() - interval '30 days'
    )::bigint AS active_30d,
    'public.users (owners + home_builder_id matches)'::text AS builder_users_source,
    'public.users WHERE user_type=''marketplace_vendor'''::text AS subcontractors_source;
END;
$$;