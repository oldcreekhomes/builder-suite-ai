DROP FUNCTION IF EXISTS public.get_employee_activity_summary(timestamptz, timestamptz);
CREATE FUNCTION public.get_employee_activity_summary(p_start_date timestamptz DEFAULT (now() - '30 days'::interval), p_end_date timestamptz DEFAULT now())
RETURNS TABLE(user_id uuid, email text, first_name text, last_name text, role text, avatar_url text, last_action timestamptz,
 bills_count bigint, pos_count bigint, bids_count bigint, jes_count bigint, files_count bigint, budgets_count bigint, schedule_count bigint, photos_count bigint, chat_count bigint, banking_count bigint, total_actions bigint,
 actions_8h bigint, actions_24h bigint, actions_7d bigint, actions_30d bigint,
 bills_8h bigint, bills_24h bigint, bills_7d bigint, bills_30d bigint,
 pos_8h bigint, pos_24h bigint, pos_7d bigint, pos_30d bigint,
 bids_8h bigint, bids_24h bigint, bids_7d bigint, bids_30d bigint,
 jes_8h bigint, jes_24h bigint, jes_7d bigint, jes_30d bigint,
 files_8h bigint, files_24h bigint, files_7d bigint, files_30d bigint,
 budgets_8h bigint, budgets_24h bigint, budgets_7d bigint, budgets_30d bigint,
 schedule_8h bigint, schedule_24h bigint, schedule_7d bigint, schedule_30d bigint,
 photos_8h bigint, photos_24h bigint, photos_7d bigint, photos_30d bigint,
 chat_8h bigint, chat_24h bigint, chat_7d bigint, chat_30d bigint,
 banking_8h bigint, banking_24h bigint, banking_7d bigint, banking_30d bigint)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  caller_tenant uuid; has_perm boolean; rec record;
  parent_tables text[] := ARRAY['bills','pending_bill_uploads','project_purchase_orders','project_bid_packages','project_bids',
    'project_files','project_folders','project_budgets','project_schedule_tasks','project_photos',
    'bill_payments','checks','deposits','credit_cards','bank_reconciliations'];
BEGIN
  caller_tenant := public.get_caller_tenant_id();
  IF caller_tenant IS NULL THEN RETURN; END IF;
  SELECT COALESCE(unp.can_access_employees,false) INTO has_perm FROM public.user_notification_preferences unp WHERE unp.user_id = auth.uid();
  IF NOT COALESCE(has_perm,false) THEN RETURN; END IF;

  CREATE TEMP TABLE IF NOT EXISTS tmp_acts (uid uuid, ts timestamptz, source text, kind text) ON COMMIT DROP;
  TRUNCATE tmp_acts;

  FOR rec IN
    SELECT table_name, BOOL_OR(column_name='updated_by') AS has_upd_by, BOOL_OR(column_name='updated_at') AS has_upd_at
    FROM information_schema.columns
    WHERE table_schema='public' AND table_name = ANY(parent_tables)
      AND column_name IN ('created_by','created_at','updated_by','updated_at')
    GROUP BY table_name
    HAVING BOOL_OR(column_name='created_by') AND BOOL_OR(column_name='created_at')
  LOOP
    BEGIN
      EXECUTE format('INSERT INTO tmp_acts SELECT created_by, created_at, %L, ''create'' FROM public.%I WHERE created_by IS NOT NULL AND created_at BETWEEN $1 AND $2', rec.table_name, rec.table_name) USING p_start_date, p_end_date;
      IF rec.has_upd_by AND rec.has_upd_at THEN
        EXECUTE format('INSERT INTO tmp_acts SELECT updated_by, updated_at, %L, ''update'' FROM public.%I WHERE updated_by IS NOT NULL AND updated_at BETWEEN $1 AND $2 AND updated_at <> created_at', rec.table_name, rec.table_name) USING p_start_date, p_end_date;
      END IF;
    EXCEPTION WHEN others THEN NULL;
    END;
  END LOOP;

  BEGIN
    INSERT INTO tmp_acts SELECT created_by, created_at, 'journal_entries', 'create' FROM public.journal_entries
    WHERE created_by IS NOT NULL AND created_at BETWEEN p_start_date AND p_end_date AND (source_type IS NULL OR source_type='manual');
  EXCEPTION WHEN others THEN NULL; END;

  BEGIN
    INSERT INTO tmp_acts SELECT sender_id, created_at, 'user_chat_messages', 'create' FROM public.user_chat_messages
    WHERE sender_id IS NOT NULL AND created_at BETWEEN p_start_date AND p_end_date;
  EXCEPTION WHEN others THEN NULL; END;

  RETURN QUERY
  WITH tenant_users AS (
    SELECT u.id, u.email, u.first_name, u.last_name, u.role, u.avatar_url FROM public.users u
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
      WHEN a.source='user_chat_messages' THEN 'chat'
      WHEN a.source IN ('bill_payments','checks','deposits','credit_cards','bank_reconciliations') THEN 'banking'
    END AS domain
    FROM tmp_acts a JOIN tenant_users tu ON tu.id = a.uid
  ), agg AS (
    SELECT uid, MAX(ts) AS last_action,
      COUNT(*) FILTER (WHERE domain='bills') c_bills, COUNT(*) FILTER (WHERE domain='pos') c_pos, COUNT(*) FILTER (WHERE domain='bids') c_bids,
      COUNT(*) FILTER (WHERE domain='jes') c_jes, COUNT(*) FILTER (WHERE domain='files') c_files, COUNT(*) FILTER (WHERE domain='budgets') c_budgets,
      COUNT(*) FILTER (WHERE domain='schedule') c_schedule, COUNT(*) FILTER (WHERE domain='photos') c_photos, COUNT(*) FILTER (WHERE domain='chat') c_chat,
      COUNT(*) FILTER (WHERE domain='banking') c_banking, COUNT(*) c_total,
      COUNT(*) FILTER (WHERE ts>=now()-interval '8 hours') a8, COUNT(*) FILTER (WHERE ts>=now()-interval '24 hours') a24, COUNT(*) FILTER (WHERE ts>=now()-interval '7 days') a7, COUNT(*) FILTER (WHERE ts>=now()-interval '30 days') a30,
      COUNT(*) FILTER (WHERE domain='bills' AND ts>=now()-interval '8 hours') b8, COUNT(*) FILTER (WHERE domain='bills' AND ts>=now()-interval '24 hours') b24, COUNT(*) FILTER (WHERE domain='bills' AND ts>=now()-interval '7 days') b7, COUNT(*) FILTER (WHERE domain='bills' AND ts>=now()-interval '30 days') b30,
      COUNT(*) FILTER (WHERE domain='pos' AND ts>=now()-interval '8 hours') p8, COUNT(*) FILTER (WHERE domain='pos' AND ts>=now()-interval '24 hours') p24, COUNT(*) FILTER (WHERE domain='pos' AND ts>=now()-interval '7 days') p7, COUNT(*) FILTER (WHERE domain='pos' AND ts>=now()-interval '30 days') p30,
      COUNT(*) FILTER (WHERE domain='bids' AND ts>=now()-interval '8 hours') d8, COUNT(*) FILTER (WHERE domain='bids' AND ts>=now()-interval '24 hours') d24, COUNT(*) FILTER (WHERE domain='bids' AND ts>=now()-interval '7 days') d7, COUNT(*) FILTER (WHERE domain='bids' AND ts>=now()-interval '30 days') d30,
      COUNT(*) FILTER (WHERE domain='jes' AND ts>=now()-interval '8 hours') j8, COUNT(*) FILTER (WHERE domain='jes' AND ts>=now()-interval '24 hours') j24, COUNT(*) FILTER (WHERE domain='jes' AND ts>=now()-interval '7 days') j7, COUNT(*) FILTER (WHERE domain='jes' AND ts>=now()-interval '30 days') j30,
      COUNT(*) FILTER (WHERE domain='files' AND ts>=now()-interval '8 hours') f8, COUNT(*) FILTER (WHERE domain='files' AND ts>=now()-interval '24 hours') f24, COUNT(*) FILTER (WHERE domain='files' AND ts>=now()-interval '7 days') f7, COUNT(*) FILTER (WHERE domain='files' AND ts>=now()-interval '30 days') f30,
      COUNT(*) FILTER (WHERE domain='budgets' AND ts>=now()-interval '8 hours') g8, COUNT(*) FILTER (WHERE domain='budgets' AND ts>=now()-interval '24 hours') g24, COUNT(*) FILTER (WHERE domain='budgets' AND ts>=now()-interval '7 days') g7, COUNT(*) FILTER (WHERE domain='budgets' AND ts>=now()-interval '30 days') g30,
      COUNT(*) FILTER (WHERE domain='schedule' AND ts>=now()-interval '8 hours') s8, COUNT(*) FILTER (WHERE domain='schedule' AND ts>=now()-interval '24 hours') s24, COUNT(*) FILTER (WHERE domain='schedule' AND ts>=now()-interval '7 days') s7, COUNT(*) FILTER (WHERE domain='schedule' AND ts>=now()-interval '30 days') s30,
      COUNT(*) FILTER (WHERE domain='photos' AND ts>=now()-interval '8 hours') h8, COUNT(*) FILTER (WHERE domain='photos' AND ts>=now()-interval '24 hours') h24, COUNT(*) FILTER (WHERE domain='photos' AND ts>=now()-interval '7 days') h7, COUNT(*) FILTER (WHERE domain='photos' AND ts>=now()-interval '30 days') h30,
      COUNT(*) FILTER (WHERE domain='chat' AND ts>=now()-interval '8 hours') m8, COUNT(*) FILTER (WHERE domain='chat' AND ts>=now()-interval '24 hours') m24, COUNT(*) FILTER (WHERE domain='chat' AND ts>=now()-interval '7 days') m7, COUNT(*) FILTER (WHERE domain='chat' AND ts>=now()-interval '30 days') m30,
      COUNT(*) FILTER (WHERE domain='banking' AND ts>=now()-interval '8 hours') k8, COUNT(*) FILTER (WHERE domain='banking' AND ts>=now()-interval '24 hours') k24, COUNT(*) FILTER (WHERE domain='banking' AND ts>=now()-interval '7 days') k7, COUNT(*) FILTER (WHERE domain='banking' AND ts>=now()-interval '30 days') k30
    FROM filtered GROUP BY uid
  )
  SELECT tu.id, tu.email, tu.first_name, tu.last_name, tu.role, tu.avatar_url, a.last_action,
    COALESCE(a.c_bills,0), COALESCE(a.c_pos,0), COALESCE(a.c_bids,0), COALESCE(a.c_jes,0), COALESCE(a.c_files,0), COALESCE(a.c_budgets,0),
    COALESCE(a.c_schedule,0), COALESCE(a.c_photos,0), COALESCE(a.c_chat,0), COALESCE(a.c_banking,0), COALESCE(a.c_total,0),
    COALESCE(a.a8,0), COALESCE(a.a24,0), COALESCE(a.a7,0), COALESCE(a.a30,0),
    COALESCE(a.b8,0), COALESCE(a.b24,0), COALESCE(a.b7,0), COALESCE(a.b30,0),
    COALESCE(a.p8,0), COALESCE(a.p24,0), COALESCE(a.p7,0), COALESCE(a.p30,0),
    COALESCE(a.d8,0), COALESCE(a.d24,0), COALESCE(a.d7,0), COALESCE(a.d30,0),
    COALESCE(a.j8,0), COALESCE(a.j24,0), COALESCE(a.j7,0), COALESCE(a.j30,0),
    COALESCE(a.f8,0), COALESCE(a.f24,0), COALESCE(a.f7,0), COALESCE(a.f30,0),
    COALESCE(a.g8,0), COALESCE(a.g24,0), COALESCE(a.g7,0), COALESCE(a.g30,0),
    COALESCE(a.s8,0), COALESCE(a.s24,0), COALESCE(a.s7,0), COALESCE(a.s30,0),
    COALESCE(a.h8,0), COALESCE(a.h24,0), COALESCE(a.h7,0), COALESCE(a.h30,0),
    COALESCE(a.m8,0), COALESCE(a.m24,0), COALESCE(a.m7,0), COALESCE(a.m30,0),
    COALESCE(a.k8,0), COALESCE(a.k24,0), COALESCE(a.k7,0), COALESCE(a.k30,0)
  FROM tenant_users tu LEFT JOIN agg a ON a.uid = tu.id
  ORDER BY LOWER(COALESCE(tu.first_name, tu.email)) ASC;
END;
$function$;
GRANT EXECUTE ON FUNCTION public.get_employee_activity_summary(timestamptz, timestamptz) TO authenticated;