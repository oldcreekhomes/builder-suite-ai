CREATE TABLE public.report_email_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  home_builder_id uuid,
  project_id uuid,
  sent_by uuid NOT NULL,
  sent_at timestamptz NOT NULL DEFAULT now(),
  recipients text
);
GRANT SELECT ON public.report_email_log TO authenticated;
GRANT ALL ON public.report_email_log TO service_role;
ALTER TABLE public.report_email_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant can view report email log" ON public.report_email_log FOR SELECT TO authenticated
USING (home_builder_id = public.get_caller_tenant_id());
CREATE INDEX ON public.report_email_log (sent_by, sent_at);

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS last_active_at timestamptz;

CREATE OR REPLACE FUNCTION public.touch_last_active()
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.users SET last_active_at = now() WHERE id = auth.uid();
$$;
REVOKE ALL ON FUNCTION public.touch_last_active() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.touch_last_active() TO authenticated;

DROP FUNCTION IF EXISTS public.get_employee_activity_summary(timestamptz, timestamptz);
CREATE FUNCTION public.get_employee_activity_summary(p_start_date timestamptz DEFAULT (now() - '30 days'::interval), p_end_date timestamptz DEFAULT now())
RETURNS TABLE(user_id uuid, email text, first_name text, last_name text, role text, avatar_url text, last_action timestamptz, total_actions bigint, counts jsonb)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  caller_tenant uuid; has_perm boolean; rec record;
  -- tables where both create and (non-automatic) update count
  full_tables text[] := ARRAY['bills','pending_bill_uploads','project_purchase_orders','project_bid_packages','project_bids',
    'project_folders','project_budgets','project_schedule_tasks','project_photos','bank_reconciliations'];
  -- tables where only creates count (updates are mostly automatic clearing during reconciliation)
  create_tables text[] := ARRAY['bill_payments','checks','deposits','credit_cards'];
BEGIN
  caller_tenant := public.get_caller_tenant_id();
  IF caller_tenant IS NULL THEN RETURN; END IF;
  SELECT COALESCE(unp.can_access_employees,false) INTO has_perm FROM public.user_notification_preferences unp WHERE unp.user_id = auth.uid();
  IF NOT COALESCE(has_perm,false) THEN RETURN; END IF;

  CREATE TEMP TABLE IF NOT EXISTS tmp_acts (uid uuid, ts timestamptz, source text) ON COMMIT DROP;
  TRUNCATE tmp_acts;

  FOR rec IN
    SELECT table_name, BOOL_OR(column_name='updated_by') AS has_upd_by, BOOL_OR(column_name='updated_at') AS has_upd_at
    FROM information_schema.columns
    WHERE table_schema='public' AND table_name = ANY(full_tables || create_tables)
      AND column_name IN ('created_by','created_at','updated_by','updated_at')
    GROUP BY table_name
    HAVING BOOL_OR(column_name='created_by') AND BOOL_OR(column_name='created_at')
  LOOP
    BEGIN
      EXECUTE format('INSERT INTO tmp_acts SELECT created_by, created_at, %L FROM public.%I WHERE created_by IS NOT NULL AND created_at BETWEEN $1 AND $2', rec.table_name, rec.table_name) USING p_start_date, p_end_date;
      IF rec.table_name = ANY(full_tables) AND rec.has_upd_by AND rec.has_upd_at THEN
        EXECUTE format('INSERT INTO tmp_acts SELECT updated_by, updated_at, %L FROM public.%I WHERE updated_by IS NOT NULL AND updated_at BETWEEN $1 AND $2 AND updated_at <> created_at', rec.table_name, rec.table_name) USING p_start_date, p_end_date;
      END IF;
    EXCEPTION WHEN others THEN NULL;
    END;
  END LOOP;

  INSERT INTO tmp_acts SELECT uploaded_by, uploaded_at, 'project_files' FROM public.project_files
   WHERE uploaded_by IS NOT NULL AND uploaded_at BETWEEN p_start_date AND p_end_date;
  INSERT INTO tmp_acts SELECT created_by, created_at, 'journal_entries' FROM public.journal_entries
   WHERE created_by IS NOT NULL AND created_at BETWEEN p_start_date AND p_end_date AND (source_type IS NULL OR source_type='manual');
  INSERT INTO tmp_acts SELECT sender_id, created_at, 'user_chat_messages' FROM public.user_chat_messages
   WHERE sender_id IS NOT NULL AND created_at BETWEEN p_start_date AND p_end_date;
  INSERT INTO tmp_acts SELECT sent_by, sent_at, 'report_email_log' FROM public.report_email_log
   WHERE sent_at BETWEEN p_start_date AND p_end_date;

  RETURN QUERY
  WITH tenant_users AS (
    SELECT u.id, u.email, u.first_name, u.last_name, u.role, u.avatar_url, u.last_active_at FROM public.users u
    WHERE (u.id = caller_tenant OR u.home_builder_id = caller_tenant) AND COALESCE(u.access_revoked,false)=false AND u.pending_removal_at IS NULL
  ), filtered AS (
    SELECT a.uid, a.ts, CASE
      WHEN a.source IN ('bills','pending_bill_uploads') THEN 'bills'
      WHEN a.source IN ('project_purchase_orders','project_bid_packages') THEN 'pos'
      WHEN a.source='project_bids' THEN 'bids'
      WHEN a.source='journal_entries' THEN 'jes'
      WHEN a.source IN ('project_files','project_folders') THEN 'files'
      WHEN a.source='project_budgets' THEN 'budgets'
      WHEN a.source='project_schedule_tasks' THEN 'schedule'
      WHEN a.source='project_photos' THEN 'photos'
      WHEN a.source='bill_payments' THEN 'payments'
      WHEN a.source='checks' THEN 'checks'
      WHEN a.source='deposits' THEN 'deposits'
      WHEN a.source='credit_cards' THEN 'credit_cards'
      WHEN a.source='bank_reconciliations' THEN 'reconciliations'
      WHEN a.source='report_email_log' THEN 'reports'
      WHEN a.source='user_chat_messages' THEN 'chat'
    END AS domain
    FROM tmp_acts a JOIN tenant_users tu ON tu.id = a.uid
  ), per_domain AS (
    SELECT uid, domain, jsonb_build_object(
      '8h', COUNT(*) FILTER (WHERE ts>=now()-interval '8 hours'),
      '24h', COUNT(*) FILTER (WHERE ts>=now()-interval '24 hours'),
      '7d', COUNT(*) FILTER (WHERE ts>=now()-interval '7 days'),
      '30d', COUNT(*)) AS c
    FROM filtered GROUP BY uid, domain
  ), agg AS (
    SELECT f.uid, MAX(f.ts) AS last_ts, COUNT(*) AS total FROM filtered f GROUP BY f.uid
  ), dj AS (
    SELECT uid, jsonb_object_agg(domain, c) AS counts FROM per_domain GROUP BY uid
  )
  SELECT tu.id, tu.email, tu.first_name, tu.last_name, tu.role, tu.avatar_url,
    NULLIF(GREATEST(COALESCE(a.last_ts,'-infinity'), COALESCE(tu.last_active_at,'-infinity')), '-infinity'::timestamptz),
    COALESCE(a.total,0), COALESCE(dj.counts,'{}'::jsonb)
  FROM tenant_users tu LEFT JOIN agg a ON a.uid = tu.id LEFT JOIN dj ON dj.uid = tu.id
  ORDER BY LOWER(COALESCE(tu.first_name, tu.email)) ASC;
END;
$function$;
GRANT EXECUTE ON FUNCTION public.get_employee_activity_summary(timestamptz, timestamptz) TO authenticated;