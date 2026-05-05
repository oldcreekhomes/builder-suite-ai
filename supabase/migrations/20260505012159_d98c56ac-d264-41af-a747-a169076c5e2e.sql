CREATE OR REPLACE FUNCTION public.get_employee_activity_summary(start_date timestamp with time zone DEFAULT (now() - '30 days'::interval), end_date timestamp with time zone DEFAULT now())
 RETURNS TABLE(user_id uuid, email text, first_name text, last_name text, role text, avatar_url text, last_action timestamp with time zone, bills_count bigint, pos_count bigint, bids_count bigint, jes_count bigint, files_count bigint, budgets_count bigint, schedule_count bigint, total_actions bigint)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  caller_tenant uuid;
  has_perm boolean;
BEGIN
  caller_tenant := public.get_caller_tenant_id();
  IF caller_tenant IS NULL THEN RETURN; END IF;

  SELECT COALESCE(can_access_employees, false) INTO has_perm
  FROM public.user_notification_preferences
  WHERE user_notification_preferences.user_id = auth.uid();
  IF NOT COALESCE(has_perm, false) THEN RETURN; END IF;

  RETURN QUERY
  WITH tenant_users AS (
    SELECT u.id, u.email, u.first_name, u.last_name, u.role, u.avatar_url
    FROM public.users u
    WHERE u.id = caller_tenant OR u.home_builder_id = caller_tenant
  ),
  acts AS (
    SELECT b.updated_by AS uid, b.updated_at AS ts, 'bill'::text AS kind FROM public.bills b
      WHERE b.owner_id = caller_tenant AND b.updated_at BETWEEN start_date AND end_date
    UNION ALL
    SELECT b.created_by, b.created_at, 'bill' FROM public.bills b
      WHERE b.owner_id = caller_tenant AND b.created_at BETWEEN start_date AND end_date
    UNION ALL
    SELECT po.updated_by, po.updated_at, 'po' FROM public.project_purchase_orders po
      WHERE po.updated_at BETWEEN start_date AND end_date
    UNION ALL
    SELECT po.created_by, po.created_at, 'po' FROM public.project_purchase_orders po
      WHERE po.created_at BETWEEN start_date AND end_date
    UNION ALL
    SELECT pb.created_by, pb.created_at, 'bid' FROM public.project_bids pb
      WHERE pb.created_at BETWEEN start_date AND end_date
    UNION ALL
    SELECT je.created_by, je.created_at, 'je' FROM public.journal_entries je
      WHERE je.owner_id = caller_tenant AND je.created_at BETWEEN start_date AND end_date
    UNION ALL
    SELECT pf.uploaded_by, pf.uploaded_at, 'file' FROM public.project_files pf
      WHERE pf.uploaded_at BETWEEN start_date AND end_date
        AND COALESCE(pf.is_deleted, false) = false
    UNION ALL
    SELECT pbg.created_by, pbg.created_at, 'budget' FROM public.project_budgets pbg
      WHERE pbg.created_at BETWEEN start_date AND end_date
    UNION ALL
    SELECT pst.updated_by, pst.updated_at, 'schedule' FROM public.project_schedule_tasks pst
      WHERE pst.updated_at BETWEEN start_date AND end_date
  ),
  filtered AS (
    SELECT a.uid, a.ts, a.kind FROM acts a
    JOIN tenant_users tu ON tu.id = a.uid
    WHERE a.uid IS NOT NULL
  ),
  agg AS (
    SELECT uid,
      MAX(ts) AS last_action,
      COUNT(*) FILTER (WHERE kind='bill') AS bills_count,
      COUNT(*) FILTER (WHERE kind='po') AS pos_count,
      COUNT(*) FILTER (WHERE kind='bid') AS bids_count,
      COUNT(*) FILTER (WHERE kind='je') AS jes_count,
      COUNT(*) FILTER (WHERE kind='file') AS files_count,
      COUNT(*) FILTER (WHERE kind='budget') AS budgets_count,
      COUNT(*) FILTER (WHERE kind='schedule') AS schedule_count,
      COUNT(*) AS total_actions
    FROM filtered GROUP BY uid
  )
  SELECT tu.id, tu.email, tu.first_name, tu.last_name, tu.role, tu.avatar_url,
    a.last_action,
    COALESCE(a.bills_count,0), COALESCE(a.pos_count,0), COALESCE(a.bids_count,0),
    COALESCE(a.jes_count,0), COALESCE(a.files_count,0), COALESCE(a.budgets_count,0),
    COALESCE(a.schedule_count,0), COALESCE(a.total_actions,0)
  FROM tenant_users tu
  LEFT JOIN agg a ON a.uid = tu.id
  ORDER BY a.last_action DESC NULLS LAST, tu.first_name;
END;
$function$;