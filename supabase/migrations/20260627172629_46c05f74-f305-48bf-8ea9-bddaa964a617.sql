
-- ============================================================
-- 1) Guard: block customer-app code from granting platform_admin
-- ============================================================
CREATE OR REPLACE FUNCTION public.guard_platform_admin_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  caller_role text := current_setting('request.jwt.claim.role', true);
BEGIN
  IF NEW.role = 'platform_admin'::public.app_role THEN
    -- Only the service_role (used by the separate admin Lovable project's
    -- edge functions) is permitted to grant platform_admin. Any request
    -- coming through the anon/authenticated PostgREST surface is rejected.
    IF current_user <> 'service_role' AND coalesce(caller_role, '') <> 'service_role' THEN
      RAISE EXCEPTION 'platform_admin role can only be granted from the admin app (service_role)'
        USING ERRCODE = '42501';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_platform_admin_role_ins ON public.user_roles;
CREATE TRIGGER guard_platform_admin_role_ins
BEFORE INSERT ON public.user_roles
FOR EACH ROW EXECUTE FUNCTION public.guard_platform_admin_role();

DROP TRIGGER IF EXISTS guard_platform_admin_role_upd ON public.user_roles;
CREATE TRIGGER guard_platform_admin_role_upd
BEFORE UPDATE OF role ON public.user_roles
FOR EACH ROW EXECUTE FUNCTION public.guard_platform_admin_role();


-- ============================================================
-- 2) Defense in depth: gate platform_admin RLS escape policies
--    behind an admin-app JWT claim (app = 'admin').
--    The customer Lovable project never sets this claim, so even
--    if a platform_admin role row somehow existed, the cross-tenant
--    read would not unlock from the customer app.
-- ============================================================
CREATE OR REPLACE FUNCTION public.is_admin_app_session()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT coalesce(
    (current_setting('request.jwt.claims', true)::jsonb->>'app') = 'admin',
    false
  );
$$;

-- projects
DROP POLICY IF EXISTS "Platform admins can view all projects" ON public.projects;
CREATE POLICY "Platform admins can view all projects"
ON public.projects FOR SELECT
USING (public.has_role(auth.uid(), 'platform_admin'::public.app_role) AND public.is_admin_app_session());

-- bills
DROP POLICY IF EXISTS "Platform admins can view all bills" ON public.bills;
CREATE POLICY "Platform admins can view all bills"
ON public.bills FOR SELECT
USING (public.has_role(auth.uid(), 'platform_admin'::public.app_role) AND public.is_admin_app_session());

-- bill_lines
DROP POLICY IF EXISTS "Platform admins can view all bill_lines" ON public.bill_lines;
CREATE POLICY "Platform admins can view all bill_lines"
ON public.bill_lines FOR SELECT
USING (public.has_role(auth.uid(), 'platform_admin'::public.app_role) AND public.is_admin_app_session());

-- companies
DROP POLICY IF EXISTS "Platform admins can view all companies" ON public.companies;
CREATE POLICY "Platform admins can view all companies"
ON public.companies FOR SELECT
USING (public.has_role(auth.uid(), 'platform_admin'::public.app_role) AND public.is_admin_app_session());

-- pending_bill_uploads
DROP POLICY IF EXISTS "Platform admins can view all pending_bill_uploads" ON public.pending_bill_uploads;
CREATE POLICY "Platform admins can view all pending_bill_uploads"
ON public.pending_bill_uploads FOR SELECT
USING (public.has_role(auth.uid(), 'platform_admin'::public.app_role) AND public.is_admin_app_session());

-- project_budgets
DROP POLICY IF EXISTS "Platform admins can view all project_budgets" ON public.project_budgets;
CREATE POLICY "Platform admins can view all project_budgets"
ON public.project_budgets FOR SELECT
USING (public.has_role(auth.uid(), 'platform_admin'::public.app_role) AND public.is_admin_app_session());

-- project_lots
DROP POLICY IF EXISTS "Platform admins can view all project_lots" ON public.project_lots;
CREATE POLICY "Platform admins can view all project_lots"
ON public.project_lots FOR SELECT
USING (public.has_role(auth.uid(), 'platform_admin'::public.app_role) AND public.is_admin_app_session());

-- user_notification_preferences
DROP POLICY IF EXISTS "Platform admins can view all notification_preferences" ON public.user_notification_preferences;
CREATE POLICY "Platform admins can view all notification_preferences"
ON public.user_notification_preferences FOR SELECT
USING (public.has_role(auth.uid(), 'platform_admin'::public.app_role) AND public.is_admin_app_session());

-- user_roles
DROP POLICY IF EXISTS "Platform admins can view all user_roles" ON public.user_roles;
CREATE POLICY "Platform admins can view all user_roles"
ON public.user_roles FOR SELECT
USING (public.has_role(auth.uid(), 'platform_admin'::public.app_role) AND public.is_admin_app_session());

-- users
DROP POLICY IF EXISTS "Platform admins can view all users" ON public.users;
CREATE POLICY "Platform admins can view all users"
ON public.users FOR SELECT
USING (public.has_role(auth.uid(), 'platform_admin'::public.app_role) AND public.is_admin_app_session());

-- company_feature_access (both read + write escape policies)
DROP POLICY IF EXISTS "admins read access flags" ON public.company_feature_access;
CREATE POLICY "admins read access flags"
ON public.company_feature_access FOR SELECT
USING (public.has_role(auth.uid(), 'platform_admin'::public.app_role) AND public.is_admin_app_session());

DROP POLICY IF EXISTS "admins write access flags" ON public.company_feature_access;
CREATE POLICY "admins write access flags"
ON public.company_feature_access FOR ALL
USING (public.has_role(auth.uid(), 'platform_admin'::public.app_role) AND public.is_admin_app_session())
WITH CHECK (public.has_role(auth.uid(), 'platform_admin'::public.app_role) AND public.is_admin_app_session());
