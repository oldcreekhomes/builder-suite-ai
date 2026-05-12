CREATE OR REPLACE FUNCTION public.get_employee_activity_summary(p_start_date timestamp with time zone DEFAULT (now() - '30 days'::interval), p_end_date timestamp with time zone DEFAULT now())
 RETURNS TABLE(user_id uuid, email text, first_name text, last_name text, role text, avatar_url text, last_action timestamp with time zone, bills_count bigint, pos_count bigint, bids_count bigint, jes_count bigint, files_count bigint, budgets_count bigint, schedule_count bigint, photos_count bigint, chat_count bigint, total_actions bigint)
 LANGUAGE plpgsql
 VOLATILE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  caller_tenant uuid;
  has_perm boolean;
  rec record;
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
    EXCEPTION WHEN others THEN
      NULL;
    END;
  END LOOP;

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
    SELECT a.uid, a.ts, a.source
    FROM tmp_acts a
    JOIN tenant_users tu ON tu.id = a.uid
  ),
  agg AS (
    SELECT uid,
      MAX(ts) AS last_action,
      COUNT(*) FILTER (WHERE source IN (
        'bills','bill_lines','bill_payments','bill_attachments',
        'pending_bill_uploads','pending_bill_lines'
      )) AS bills_count,
      COUNT(*) FILTER (WHERE source IN (
        'project_purchase_orders','project_bid_packages'
      )) AS pos_count,
      COUNT(*) FILTER (WHERE source = 'project_bids') AS bids_count,
      COUNT(*) FILTER (WHERE source IN (
        'journal_entries','journal_entry_lines','journal_entry_attachments'
      )) AS jes_count,
      COUNT(*) FILTER (WHERE source IN (
        'project_files','project_folders'
      )) AS files_count,
      COUNT(*) FILTER (WHERE source IN (
        'project_budgets','project_budget_manual_lines','budget_subcategory_selections'
      )) AS budgets_count,
      COUNT(*) FILTER (WHERE source = 'project_schedule_tasks') AS schedule_count,
      COUNT(*) FILTER (WHERE source = 'project_photos') AS photos_count,
      COUNT(*) FILTER (WHERE source = 'user_chat_messages') AS chat_count,
      COUNT(*) AS total_actions
    FROM filtered GROUP BY uid
  )
  SELECT tu.id, tu.email, tu.first_name, tu.last_name, tu.role, tu.avatar_url,
    a.last_action,
    COALESCE(a.bills_count,0), COALESCE(a.pos_count,0), COALESCE(a.bids_count,0),
    COALESCE(a.jes_count,0), COALESCE(a.files_count,0), COALESCE(a.budgets_count,0),
    COALESCE(a.schedule_count,0), COALESCE(a.photos_count,0), COALESCE(a.chat_count,0),
    COALESCE(a.total_actions,0)
  FROM tenant_users tu
  LEFT JOIN agg a ON a.uid = tu.id
  ORDER BY a.last_action DESC NULLS LAST, tu.first_name;
END;
$function$;