
CREATE OR REPLACE FUNCTION public.set_audit_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  uid uuid := auth.uid();
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF uid IS NOT NULL THEN
      IF to_jsonb(NEW) ? 'created_by' AND NEW.created_by IS NULL THEN
        NEW.created_by := uid;
      END IF;
      IF to_jsonb(NEW) ? 'updated_by' AND NEW.updated_by IS NULL THEN
        NEW.updated_by := uid;
      END IF;
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF to_jsonb(NEW) ? 'created_by' THEN
      NEW.created_by := OLD.created_by;
    END IF;
    IF uid IS NOT NULL AND to_jsonb(NEW) ? 'updated_by' THEN
      NEW.updated_by := uid;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DO $$
DECLARE
  t text;
  owner_col text;
  all_tables text[] := ARRAY[
    'project_bids','project_bid_packages','project_budgets','project_budget_manual_lines',
    'budget_subcategory_selections','budget_warning_rules',
    'journal_entries','journal_entry_lines','bill_lines','check_lines','deposit_lines','credit_card_lines',
    'accounts','accounting_periods','accounting_settings','bank_reconciliations',
    'cost_codes','cost_code_specifications','cost_code_price_history','vendor_aliases',
    'bill_categorization_examples','recurring_transactions','recurring_transaction_lines',
    'check_print_settings','project_check_settings',
    'projects','project_lots','project_schedule_tasks','project_folder_access_grants',
    'companies','company_representatives','company_feature_access',
    'marketplace_companies','marketplace_subscriptions','subscriptions',
    'project_files','project_photos','bill_attachments','check_attachments','deposit_attachments',
    'credit_card_attachments','journal_entry_attachments','issue_files',
    'pending_bill_uploads','pending_bill_lines','pending_insurance_uploads',
    'takeoff_projects','takeoff_sheets','takeoff_items','takeoff_annotations',
    'takeoff_project_estimate_items','takeoff_project_profiles',
    'apartment_inputs','apartment_pro_formas',
    'dashboard_card_settings','user_notification_preferences','template_content',
    'bills','checks','deposits','credit_cards','bill_payments',
    'project_purchase_orders','project_folders','shared_links','company_issues'
  ];
BEGIN
  FOREACH t IN ARRAY all_tables LOOP
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name=t) THEN
      CONTINUE;
    END IF;

    EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES public.users(id) ON DELETE SET NULL', t);
    EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS updated_by uuid REFERENCES public.users(id) ON DELETE SET NULL', t);
    EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON public.%I(created_by)', 'idx_'||t||'_created_by', t);
    EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON public.%I(updated_by)', 'idx_'||t||'_updated_by', t);

    SELECT column_name INTO owner_col FROM information_schema.columns
      WHERE table_schema='public' AND table_name=t AND column_name IN ('owner_id','home_builder_id','user_id')
      ORDER BY CASE column_name WHEN 'owner_id' THEN 1 WHEN 'home_builder_id' THEN 2 ELSE 3 END LIMIT 1;
    IF owner_col IS NOT NULL THEN
      EXECUTE format(
        'UPDATE public.%I tgt SET created_by = tgt.%I
           WHERE tgt.created_by IS NULL
             AND tgt.%I IS NOT NULL
             AND EXISTS (SELECT 1 FROM public.users u WHERE u.id = tgt.%I)',
        t, owner_col, owner_col, owner_col);
      EXECUTE format(
        'UPDATE public.%I SET updated_by = created_by
           WHERE updated_by IS NULL AND created_by IS NOT NULL', t);
    END IF;

    EXECUTE format('DROP TRIGGER IF EXISTS trg_set_audit_user ON public.%I', t);
    EXECUTE format('CREATE TRIGGER trg_set_audit_user BEFORE INSERT OR UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.set_audit_user()', t);
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.get_caller_tenant_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$ SELECT COALESCE(home_builder_id, id) FROM public.users WHERE id = auth.uid() $$;

CREATE OR REPLACE FUNCTION public.get_employee_activity_summary(
  start_date timestamptz DEFAULT (now() - interval '30 days'),
  end_date timestamptz DEFAULT now()
)
RETURNS TABLE(
  user_id uuid, email text, first_name text, last_name text, role text, avatar_url text,
  last_action timestamptz,
  bills_count bigint, pos_count bigint, bids_count bigint, jes_count bigint,
  files_count bigint, budgets_count bigint, schedule_count bigint, total_actions bigint
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
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
    SELECT pf.created_by, pf.created_at, 'file' FROM public.project_files pf
      WHERE pf.created_at BETWEEN start_date AND end_date
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
$$;

CREATE OR REPLACE FUNCTION public.get_users_last_sign_in(user_ids uuid[])
RETURNS TABLE(user_id uuid, last_sign_in_at timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
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
  SELECT au.id, au.last_sign_in_at
  FROM auth.users au
  JOIN public.users pu ON pu.id = au.id
  WHERE au.id = ANY(user_ids)
    AND (pu.id = caller_tenant OR pu.home_builder_id = caller_tenant);
END;
$$;
