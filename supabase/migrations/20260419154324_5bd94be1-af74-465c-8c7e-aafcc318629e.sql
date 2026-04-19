-- 1. Grant platform_admin role to mgray@oldcreekhomes.com
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'platform_admin'::app_role
FROM auth.users
WHERE email = 'mgray@oldcreekhomes.com'
ON CONFLICT (user_id, role) DO NOTHING;

-- 2. Cross-tenant SELECT policies for platform_admin (additive)
CREATE POLICY "Platform admins can view all users"
  ON public.users FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'platform_admin'));

CREATE POLICY "Platform admins can view all user_roles"
  ON public.user_roles FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'platform_admin'));

CREATE POLICY "Platform admins can view all notification_preferences"
  ON public.user_notification_preferences FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'platform_admin'));

CREATE POLICY "Platform admins can view all projects"
  ON public.projects FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'platform_admin'));

CREATE POLICY "Platform admins can view all project_lots"
  ON public.project_lots FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'platform_admin'));

CREATE POLICY "Platform admins can view all project_budgets"
  ON public.project_budgets FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'platform_admin'));

CREATE POLICY "Platform admins can view all bills"
  ON public.bills FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'platform_admin'));

CREATE POLICY "Platform admins can view all bill_lines"
  ON public.bill_lines FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'platform_admin'));

CREATE POLICY "Platform admins can view all companies"
  ON public.companies FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'platform_admin'));

CREATE POLICY "Platform admins can view all cost_codes"
  ON public.cost_codes FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'platform_admin'));

CREATE POLICY "Platform admins can view all pending_bill_uploads"
  ON public.pending_bill_uploads FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'platform_admin'));

-- 3. Analytics RPCs (SECURITY DEFINER, gated by platform_admin)

-- 3a. Platform overview
CREATE OR REPLACE FUNCTION public.admin_get_platform_overview()
RETURNS TABLE (
  total_builders bigint,
  total_vendors bigint,
  total_employees bigint,
  signups_7d bigint,
  signups_30d bigint,
  active_7d bigint,
  active_30d bigint
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'platform_admin') THEN
    RAISE EXCEPTION 'Access denied: platform_admin role required';
  END IF;

  RETURN QUERY
  SELECT
    (SELECT COUNT(*) FROM public.users WHERE user_type = 'home_builder')::bigint,
    (SELECT COUNT(*) FROM public.users WHERE user_type = 'marketplace_vendor')::bigint,
    (SELECT COUNT(*) FROM public.users WHERE user_type = 'employee')::bigint,
    (SELECT COUNT(*) FROM auth.users WHERE created_at >= now() - interval '7 days')::bigint,
    (SELECT COUNT(*) FROM auth.users WHERE created_at >= now() - interval '30 days')::bigint,
    (SELECT COUNT(*) FROM auth.users WHERE last_sign_in_at >= now() - interval '7 days')::bigint,
    (SELECT COUNT(*) FROM auth.users WHERE last_sign_in_at >= now() - interval '30 days')::bigint;
END;
$$;

-- 3b. Signup funnel
CREATE OR REPLACE FUNCTION public.admin_get_signup_funnel(start_date date, end_date date)
RETURNS TABLE (
  signup_date date,
  user_type text,
  signup_count bigint
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'platform_admin') THEN
    RAISE EXCEPTION 'Access denied: platform_admin role required';
  END IF;

  RETURN QUERY
  SELECT
    u.created_at::date AS signup_date,
    COALESCE(u.user_type, 'unknown') AS user_type,
    COUNT(*)::bigint AS signup_count
  FROM public.users u
  WHERE u.created_at::date BETWEEN start_date AND end_date
  GROUP BY u.created_at::date, u.user_type
  ORDER BY u.created_at::date ASC;
END;
$$;

-- 3c. Builder health
CREATE OR REPLACE FUNCTION public.admin_get_builder_health()
RETURNS TABLE (
  id uuid,
  email text,
  company_name text,
  signup_date timestamptz,
  last_sign_in_at timestamptz,
  days_since_signup integer,
  project_count bigint,
  bill_count bigint,
  pending_upload_count bigint
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'platform_admin') THEN
    RAISE EXCEPTION 'Access denied: platform_admin role required';
  END IF;

  RETURN QUERY
  SELECT
    u.id,
    u.email,
    u.company_name,
    au.created_at AS signup_date,
    au.last_sign_in_at,
    EXTRACT(DAY FROM (now() - au.created_at))::integer AS days_since_signup,
    (SELECT COUNT(*) FROM public.projects p WHERE p.owner_id = u.id)::bigint,
    (SELECT COUNT(*) FROM public.bills b WHERE b.owner_id = u.id)::bigint,
    (SELECT COUNT(*) FROM public.pending_bill_uploads pbu WHERE pbu.owner_id = u.id)::bigint
  FROM public.users u
  JOIN auth.users au ON au.id = u.id
  WHERE u.user_type = 'home_builder' AND u.role = 'owner'
  ORDER BY au.created_at DESC;
END;
$$;

-- 3d. Re-engagement queue
CREATE OR REPLACE FUNCTION public.admin_get_reengagement_queue()
RETURNS TABLE (
  id uuid,
  email text,
  company_name text,
  first_name text,
  last_name text,
  phone_number text,
  signup_date timestamptz,
  last_sign_in_at timestamptz,
  sign_in_count integer,
  days_since_last_signin integer
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'platform_admin') THEN
    RAISE EXCEPTION 'Access denied: platform_admin role required';
  END IF;

  RETURN QUERY
  SELECT
    u.id,
    u.email,
    u.company_name,
    u.first_name,
    u.last_name,
    u.phone_number,
    au.created_at AS signup_date,
    au.last_sign_in_at,
    COALESCE((au.raw_app_meta_data->>'sign_in_count')::integer, 0) AS sign_in_count,
    CASE
      WHEN au.last_sign_in_at IS NULL THEN NULL
      ELSE EXTRACT(DAY FROM (now() - au.last_sign_in_at))::integer
    END AS days_since_last_signin
  FROM public.users u
  JOIN auth.users au ON au.id = u.id
  WHERE u.user_type = 'home_builder'
    AND u.role = 'owner'
    AND (
      au.last_sign_in_at IS NULL
      OR au.last_sign_in_at < now() - interval '7 days'
    )
  ORDER BY au.last_sign_in_at ASC NULLS FIRST;
END;
$$;