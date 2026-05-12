CREATE OR REPLACE FUNCTION public.get_employee_activity_summary(
  p_start_date timestamp with time zone DEFAULT (now() - '30 days'::interval),
  p_end_date timestamp with time zone DEFAULT now()
)
RETURNS TABLE(
  user_id uuid, email text, first_name text, last_name text, role text, avatar_url text,
  last_action timestamp with time zone,
  bills_count bigint, pos_count bigint, bids_count bigint, jes_count bigint,
  files_count bigint, budgets_count bigint, schedule_count bigint, photos_count bigint, chat_count bigint,
  total_actions bigint,
  actions_8h bigint, actions_24h bigint, actions_7d bigint, actions_30d bigint,
  bills_8h bigint, bills_24h bigint, bills_7d bigint, bills_30d bigint,
  pos_8h bigint, pos_24h bigint, pos_7d bigint, pos_30d bigint,
  bids_8h bigint, bids_24h bigint, bids_7d bigint, bids_30d bigint,
  jes_8h bigint, jes_24h bigint, jes_7d bigint, jes_30d bigint,
  files_8h bigint, files_24h bigint, files_7d bigint, files_30d bigint,
  budgets_8h bigint, budgets_24h bigint, budgets_7d bigint, budgets_30d bigint,
  schedule_8h bigint, schedule_24h bigint, schedule_7d bigint, schedule_30d bigint,
  photos_8h bigint, photos_24h bigint, photos_7d bigint, photos_30d bigint,
  chat_8h bigint, chat_24h bigint, chat_7d bigint, chat_30d bigint
)
LANGUAGE plpgsql
VOLATILE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  caller_tenant uuid;
  has_perm boolean;
  rec record;
  -- journal_entries handled separately (manual only); excluded from generic loop
  parent_tables text[] := ARRAY[
    'bills','pending_bill_uploads',
    'project_purchase_orders','project_bid_packages',
    'project_bids',
    'project_files','project_folders',
    'project_budgets',
    'project_schedule_tasks',
    'project_photos'
  ];
BEGIN
  caller_tenant := public.get_caller_tenant_id();
  IF caller_tenant IS NULL THEN RETURN; END IF;

  SELECT COALESCE(unp.can_access_employees, false) INTO has_perm
  FROM public.user_notification_preferences unp
  WHERE unp.user_id = auth.uid();
  IF NOT COALESCE(has_perm, false) THEN RETURN; END IF;

  CREATE TEMP TABLE IF NOT EXISTS tmp_acts (
    uid uuid, ts timestamptz, source text, kind text
  ) ON COMMIT DROP;
  TRUNCATE tmp_acts;

  FOR rec IN
    SELECT table_name,
           BOOL_OR(column_name='updated_by') AS has_upd_by,
           BOOL_OR(column_name='updated_at') AS has_upd_at
    FROM information_schema.columns
    WHERE table_schema='public'
      AND table_name = ANY(parent_tables)
      AND column_name IN ('created_by','created_at','updated_by','updated_at')
    GROUP BY table_name
    HAVING BOOL_OR(column_name='created_by')
       AND BOOL_OR(column_name='created_at')
  LOOP
    BEGIN
      EXECUTE format(
        'INSERT INTO tmp_acts(uid, ts, source, kind)
         SELECT created_by, created_at, %L, ''create''
         FROM public.%I
         WHERE created_by IS NOT NULL
           AND created_at BETWEEN $1 AND $2',
        rec.table_name, rec.table_name
      ) USING p_start_date, p_end_date;

      IF rec.has_upd_by AND rec.has_upd_at THEN
        EXECUTE format(
          'INSERT INTO tmp_acts(uid, ts, source, kind)
           SELECT updated_by, updated_at, %L, ''update''
           FROM public.%I
           WHERE updated_by IS NOT NULL
             AND updated_at BETWEEN $1 AND $2
             AND updated_at <> created_at',
          rec.table_name, rec.table_name
        ) USING p_start_date, p_end_date;
      END IF;
    EXCEPTION WHEN others THEN NULL;
    END;
  END LOOP;

  -- Manual journal entries only: exclude generated entries from bills, payments, checks, deposits.
  -- Also only count CREATE actions for JEs (bulk maintenance updates would heavily inflate).
  BEGIN
    INSERT INTO tmp_acts(uid, ts, source, kind)
    SELECT created_by, created_at, 'journal_entries', 'create'
    FROM public.journal_entries
    WHERE created_by IS NOT NULL
      AND created_at BETWEEN p_start_date AND p_end_date
      AND (source_type IS NULL OR source_type = 'manual');
  EXCEPTION WHEN others THEN NULL;
  END;

  BEGIN
    INSERT INTO tmp_acts(uid, ts, source, kind)
    SELECT sender_id, created_at, 'user_chat_messages', 'create'
    FROM public.user_chat_messages
    WHERE sender_id IS NOT NULL
      AND created_at BETWEEN p_start_date AND p_end_date;
  EXCEPTION WHEN others THEN NULL;
  END;

  RETURN QUERY
  WITH tenant_users AS (
    SELECT u.id, u.email, u.first_name, u.last_name, u.role, u.avatar_url
    FROM public.users u
    WHERE u.id = caller_tenant OR u.home_builder_id = caller_tenant
  ),
  filtered AS (
    SELECT a.uid, a.ts,
      CASE
        WHEN a.source IN ('bills','pending_bill_uploads') THEN 'bills'
        WHEN a.source IN ('project_purchase_orders','project_bid_packages') THEN 'pos'
        WHEN a.source = 'project_bids' THEN 'bids'
        WHEN a.source = 'journal_entries' THEN 'jes'
        WHEN a.source IN ('project_files','project_folders') THEN 'files'
        WHEN a.source = 'project_budgets' THEN 'budgets'
        WHEN a.source = 'project_schedule_tasks' THEN 'schedule'
        WHEN a.source = 'project_photos' THEN 'photos'
        WHEN a.source = 'user_chat_messages' THEN 'chat'
      END AS domain
    FROM tmp_acts a
    JOIN tenant_users tu ON tu.id = a.uid
  ),
  agg AS (
    SELECT uid,
      MAX(ts) AS last_action,
      COUNT(*) FILTER (WHERE domain='bills') AS bills_count,
      COUNT(*) FILTER (WHERE domain='pos') AS pos_count,
      COUNT(*) FILTER (WHERE domain='bids') AS bids_count,
      COUNT(*) FILTER (WHERE domain='jes') AS jes_count,
      COUNT(*) FILTER (WHERE domain='files') AS files_count,
      COUNT(*) FILTER (WHERE domain='budgets') AS budgets_count,
      COUNT(*) FILTER (WHERE domain='schedule') AS schedule_count,
      COUNT(*) FILTER (WHERE domain='photos') AS photos_count,
      COUNT(*) FILTER (WHERE domain='chat') AS chat_count,
      COUNT(*) AS total_actions,
      COUNT(*) FILTER (WHERE ts >= now() - interval '8 hours') AS actions_8h,
      COUNT(*) FILTER (WHERE ts >= now() - interval '24 hours') AS actions_24h,
      COUNT(*) FILTER (WHERE ts >= now() - interval '7 days') AS actions_7d,
      COUNT(*) FILTER (WHERE ts >= now() - interval '30 days') AS actions_30d,
      COUNT(*) FILTER (WHERE domain='bills' AND ts >= now() - interval '8 hours') AS bills_8h,
      COUNT(*) FILTER (WHERE domain='bills' AND ts >= now() - interval '24 hours') AS bills_24h,
      COUNT(*) FILTER (WHERE domain='bills' AND ts >= now() - interval '7 days') AS bills_7d,
      COUNT(*) FILTER (WHERE domain='bills' AND ts >= now() - interval '30 days') AS bills_30d,
      COUNT(*) FILTER (WHERE domain='pos' AND ts >= now() - interval '8 hours') AS pos_8h,
      COUNT(*) FILTER (WHERE domain='pos' AND ts >= now() - interval '24 hours') AS pos_24h,
      COUNT(*) FILTER (WHERE domain='pos' AND ts >= now() - interval '7 days') AS pos_7d,
      COUNT(*) FILTER (WHERE domain='pos' AND ts >= now() - interval '30 days') AS pos_30d,
      COUNT(*) FILTER (WHERE domain='bids' AND ts >= now() - interval '8 hours') AS bids_8h,
      COUNT(*) FILTER (WHERE domain='bids' AND ts >= now() - interval '24 hours') AS bids_24h,
      COUNT(*) FILTER (WHERE domain='bids' AND ts >= now() - interval '7 days') AS bids_7d,
      COUNT(*) FILTER (WHERE domain='bids' AND ts >= now() - interval '30 days') AS bids_30d,
      COUNT(*) FILTER (WHERE domain='jes' AND ts >= now() - interval '8 hours') AS jes_8h,
      COUNT(*) FILTER (WHERE domain='jes' AND ts >= now() - interval '24 hours') AS jes_24h,
      COUNT(*) FILTER (WHERE domain='jes' AND ts >= now() - interval '7 days') AS jes_7d,
      COUNT(*) FILTER (WHERE domain='jes' AND ts >= now() - interval '30 days') AS jes_30d,
      COUNT(*) FILTER (WHERE domain='files' AND ts >= now() - interval '8 hours') AS files_8h,
      COUNT(*) FILTER (WHERE domain='files' AND ts >= now() - interval '24 hours') AS files_24h,
      COUNT(*) FILTER (WHERE domain='files' AND ts >= now() - interval '7 days') AS files_7d,
      COUNT(*) FILTER (WHERE domain='files' AND ts >= now() - interval '30 days') AS files_30d,
      COUNT(*) FILTER (WHERE domain='budgets' AND ts >= now() - interval '8 hours') AS budgets_8h,
      COUNT(*) FILTER (WHERE domain='budgets' AND ts >= now() - interval '24 hours') AS budgets_24h,
      COUNT(*) FILTER (WHERE domain='budgets' AND ts >= now() - interval '7 days') AS budgets_7d,
      COUNT(*) FILTER (WHERE domain='budgets' AND ts >= now() - interval '30 days') AS budgets_30d,
      COUNT(*) FILTER (WHERE domain='schedule' AND ts >= now() - interval '8 hours') AS schedule_8h,
      COUNT(*) FILTER (WHERE domain='schedule' AND ts >= now() - interval '24 hours') AS schedule_24h,
      COUNT(*) FILTER (WHERE domain='schedule' AND ts >= now() - interval '7 days') AS schedule_7d,
      COUNT(*) FILTER (WHERE domain='schedule' AND ts >= now() - interval '30 days') AS schedule_30d,
      COUNT(*) FILTER (WHERE domain='photos' AND ts >= now() - interval '8 hours') AS photos_8h,
      COUNT(*) FILTER (WHERE domain='photos' AND ts >= now() - interval '24 hours') AS photos_24h,
      COUNT(*) FILTER (WHERE domain='photos' AND ts >= now() - interval '7 days') AS photos_7d,
      COUNT(*) FILTER (WHERE domain='photos' AND ts >= now() - interval '30 days') AS photos_30d,
      COUNT(*) FILTER (WHERE domain='chat' AND ts >= now() - interval '8 hours') AS chat_8h,
      COUNT(*) FILTER (WHERE domain='chat' AND ts >= now() - interval '24 hours') AS chat_24h,
      COUNT(*) FILTER (WHERE domain='chat' AND ts >= now() - interval '7 days') AS chat_7d,
      COUNT(*) FILTER (WHERE domain='chat' AND ts >= now() - interval '30 days') AS chat_30d
    FROM filtered GROUP BY uid
  )
  SELECT tu.id, tu.email, tu.first_name, tu.last_name, tu.role, tu.avatar_url,
    a.last_action,
    COALESCE(a.bills_count,0), COALESCE(a.pos_count,0), COALESCE(a.bids_count,0),
    COALESCE(a.jes_count,0), COALESCE(a.files_count,0), COALESCE(a.budgets_count,0),
    COALESCE(a.schedule_count,0), COALESCE(a.photos_count,0), COALESCE(a.chat_count,0),
    COALESCE(a.total_actions,0),
    COALESCE(a.actions_8h,0), COALESCE(a.actions_24h,0), COALESCE(a.actions_7d,0), COALESCE(a.actions_30d,0),
    COALESCE(a.bills_8h,0), COALESCE(a.bills_24h,0), COALESCE(a.bills_7d,0), COALESCE(a.bills_30d,0),
    COALESCE(a.pos_8h,0), COALESCE(a.pos_24h,0), COALESCE(a.pos_7d,0), COALESCE(a.pos_30d,0),
    COALESCE(a.bids_8h,0), COALESCE(a.bids_24h,0), COALESCE(a.bids_7d,0), COALESCE(a.bids_30d,0),
    COALESCE(a.jes_8h,0), COALESCE(a.jes_24h,0), COALESCE(a.jes_7d,0), COALESCE(a.jes_30d,0),
    COALESCE(a.files_8h,0), COALESCE(a.files_24h,0), COALESCE(a.files_7d,0), COALESCE(a.files_30d,0),
    COALESCE(a.budgets_8h,0), COALESCE(a.budgets_24h,0), COALESCE(a.budgets_7d,0), COALESCE(a.budgets_30d,0),
    COALESCE(a.schedule_8h,0), COALESCE(a.schedule_24h,0), COALESCE(a.schedule_7d,0), COALESCE(a.schedule_30d,0),
    COALESCE(a.photos_8h,0), COALESCE(a.photos_24h,0), COALESCE(a.photos_7d,0), COALESCE(a.photos_30d,0),
    COALESCE(a.chat_8h,0), COALESCE(a.chat_24h,0), COALESCE(a.chat_7d,0), COALESCE(a.chat_30d,0)
  FROM tenant_users tu
  LEFT JOIN agg a ON a.uid = tu.id
  ORDER BY LOWER(COALESCE(tu.first_name, tu.email)) ASC;
END;
$function$;