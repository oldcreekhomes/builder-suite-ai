DO $do$
DECLARE src text; newsrc text;
BEGIN
  SELECT pg_get_functiondef(oid) INTO src FROM pg_proc WHERE proname='get_employee_activity_summary' AND pronamespace='public'::regnamespace;
  newsrc := replace(src,
    'WHERE u.id = caller_tenant OR u.home_builder_id = caller_tenant',
    'WHERE (u.id = caller_tenant OR u.home_builder_id = caller_tenant) AND COALESCE(u.access_revoked, false) = false AND u.pending_removal_at IS NULL');
  IF newsrc = src THEN RAISE EXCEPTION 'tenant_users filter not found'; END IF;
  EXECUTE newsrc;
END
$do$;