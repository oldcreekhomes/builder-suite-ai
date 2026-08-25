CREATE OR REPLACE FUNCTION public.update_approved_bill_atomic(
  bill_id_param uuid,
  bill_date_param date,
  lines_param jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_bill public.bills%ROWTYPE;
  v_line jsonb;
  v_source public.bill_lines%ROWTYPE;
  v_je_id uuid;
  v_source_jel public.journal_entry_lines%ROWTYPE;
  v_new_line_number integer := 0;
  v_total_cents bigint := 0;
  v_original_cents bigint;
  v_amount_cents bigint;
  v_quantity numeric;
  v_unit_cost numeric;
  v_line_type public.bill_line_type;
  v_cost_code_id uuid;
  v_lot_id uuid;
  v_memo text;
  v_seen_count integer := 0;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF lines_param IS NULL OR jsonb_typeof(lines_param) <> 'array' OR jsonb_array_length(lines_param) = 0 THEN
    RAISE EXCEPTION 'At least one bill line is required';
  END IF;

  SELECT * INTO v_bill
  FROM public.bills
  WHERE id = bill_id_param
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Bill not found';
  END IF;

  IF v_bill.owner_id IS DISTINCT FROM auth.uid()
     AND v_bill.owner_id IS DISTINCT FROM public.get_current_user_home_builder_id() THEN
    RAISE EXCEPTION 'You do not have access to this bill';
  END IF;

  IF v_bill.status::text NOT IN ('approved', 'posted', 'paid') THEN
    RAISE EXCEPTION 'Only approved, posted, or paid bills can use this operation';
  END IF;

  IF public.is_period_closed(v_bill.bill_date, v_bill.project_id, v_bill.owner_id)
     OR public.is_period_closed(bill_date_param, v_bill.project_id, v_bill.owner_id) THEN
    RAISE EXCEPTION 'Bills in closed accounting periods cannot be updated';
  END IF;

  v_original_cents := round(v_bill.total_amount * 100)::bigint;

  FOR v_line IN SELECT value FROM jsonb_array_elements(lines_param)
  LOOP
    v_seen_count := v_seen_count + 1;

    IF NOT (v_line ? 'source_db_id') OR nullif(v_line->>'source_db_id', '') IS NULL THEN
      RAISE EXCEPTION 'Every updated line must identify its original bill line';
    END IF;

    SELECT * INTO v_source
    FROM public.bill_lines
    WHERE id = (v_line->>'source_db_id')::uuid
      AND bill_id = bill_id_param;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Original bill line not found';
    END IF;

    v_amount_cents := COALESCE((v_line->>'amount_cents')::bigint, 0);
    IF v_amount_cents = 0 THEN
      RAISE EXCEPTION 'Zero-amount bill lines are not allowed';
    END IF;

    v_total_cents := v_total_cents + v_amount_cents;
  END LOOP;

  IF v_seen_count = 0 OR v_total_cents <> v_original_cents THEN
    RAISE EXCEPTION 'The bill total cannot change. Original: %, updated: %',
      v_original_cents::numeric / 100, v_total_cents::numeric / 100;
  END IF;

  SELECT id INTO v_je_id
  FROM public.journal_entries
  WHERE source_type = 'bill'
    AND source_id = bill_id_param
    AND reversed_by_id IS NULL
  ORDER BY created_at
  LIMIT 1
  FOR UPDATE;

  IF v_je_id IS NULL THEN
    RAISE EXCEPTION 'The linked journal entry was not found';
  END IF;

  CREATE TEMP TABLE IF NOT EXISTS pg_temp.approved_bill_line_sources (
    source_db_id uuid PRIMARY KEY,
    journal_line_id uuid NOT NULL,
    account_id uuid NOT NULL,
    debit numeric NOT NULL,
    credit numeric NOT NULL
  ) ON COMMIT DROP;
  TRUNCATE pg_temp.approved_bill_line_sources;

  INSERT INTO pg_temp.approved_bill_line_sources (source_db_id, journal_line_id, account_id, debit, credit)
  SELECT bl.id, jel.id, jel.account_id, jel.debit, jel.credit
  FROM public.bill_lines bl
  JOIN public.journal_entry_lines jel
    ON jel.journal_entry_id = v_je_id
   AND jel.line_number = bl.line_number
  WHERE bl.bill_id = bill_id_param;

  IF (SELECT count(*) FROM pg_temp.approved_bill_line_sources)
     <> (SELECT count(*) FROM public.bill_lines WHERE bill_id = bill_id_param) THEN
    RAISE EXCEPTION 'The bill lines do not match the linked journal entry';
  END IF;

  DELETE FROM public.journal_entry_lines
  WHERE id IN (SELECT journal_line_id FROM pg_temp.approved_bill_line_sources);

  DELETE FROM public.bill_lines WHERE bill_id = bill_id_param;

  FOR v_line IN SELECT value FROM jsonb_array_elements(lines_param)
  LOOP
    SELECT * INTO v_source
    FROM public.bill_lines
    WHERE false;

    SELECT bl.* INTO v_source
    FROM (
      SELECT
        (v_line->>'source_db_id')::uuid AS source_db_id
    ) requested
    JOIN LATERAL (
      SELECT original.*
      FROM public.bill_lines original
      WHERE false
    ) bl ON true;

    v_amount_cents := (v_line->>'amount_cents')::bigint;
    v_quantity := 1;
    v_unit_cost := v_amount_cents::numeric / 100;
    v_line_type := (v_line->>'line_type')::public.bill_line_type;
    v_cost_code_id := nullif(v_line->>'cost_code_id', '')::uuid;
    v_lot_id := nullif(v_line->>'lot_id', '')::uuid;
    v_memo := nullif(v_line->>'memo', '');
    v_new_line_number := v_new_line_number + 1;

    SELECT account_id, debit, credit INTO v_source_jel.account_id, v_source_jel.debit, v_source_jel.credit
    FROM pg_temp.approved_bill_line_sources
    WHERE source_db_id = (v_line->>'source_db_id')::uuid;

    INSERT INTO public.bill_lines (
      bill_id, owner_id, line_number, line_type, account_id, cost_code_id,
      project_id, lot_id, quantity, unit_cost, amount, memo,
      purchase_order_id, purchase_order_line_id, po_reference, po_assignment
    )
    SELECT
      bill_id_param, old.owner_id, v_new_line_number, old.line_type, old.account_id, v_cost_code_id,
      old.project_id, v_lot_id, v_quantity, v_unit_cost, v_unit_cost, v_memo,
      old.purchase_order_id, old.purchase_order_line_id, old.po_reference, old.po_assignment
    FROM pg_temp.approved_bill_line_sources source_map
    JOIN public.bills current_bill ON current_bill.id = bill_id_param
    JOIN LATERAL (
      SELECT
        current_bill.owner_id AS owner_id,
        v_line_type AS line_type,
        CASE WHEN v_line_type = 'expense' THEN v_source_jel.account_id ELSE NULL::uuid END AS account_id,
        current_bill.project_id AS project_id,
        NULL::uuid AS purchase_order_id,
        NULL::uuid AS purchase_order_line_id,
        NULL::text AS po_reference,
        NULL::text AS po_assignment
    ) old ON true
    WHERE source_map.source_db_id = (v_line->>'source_db_id')::uuid;

    INSERT INTO public.journal_entry_lines (
      journal_entry_id, owner_id, line_number, account_id, debit, credit,
      project_id, cost_code_id, memo, lot_id
    ) VALUES (
      v_je_id, v_bill.owner_id, v_new_line_number, v_source_jel.account_id,
      CASE WHEN v_source_jel.debit <> 0 THEN v_amount_cents::numeric / 100 ELSE 0 END,
      CASE WHEN v_source_jel.credit <> 0 THEN v_amount_cents::numeric / 100 ELSE 0 END,
      v_bill.project_id, v_cost_code_id, v_memo, v_lot_id
    );
  END LOOP;

  UPDATE public.journal_entry_lines
  SET line_number = line_number + v_new_line_number
  WHERE journal_entry_id = v_je_id
    AND id NOT IN (
      SELECT journal_line_id FROM pg_temp.approved_bill_line_sources
    );

  UPDATE public.bills
  SET bill_date = bill_date_param,
      total_amount = v_original_cents::numeric / 100,
      updated_at = now()
  WHERE id = bill_id_param;

  UPDATE public.journal_entries
  SET entry_date = bill_date_param,
      updated_at = now()
  WHERE id = v_je_id;

  IF (SELECT round(sum(amount) * 100)::bigint FROM public.bill_lines WHERE bill_id = bill_id_param) <> v_original_cents THEN
    RAISE EXCEPTION 'Bill line verification failed';
  END IF;

  IF (
    SELECT round((sum(debit) - sum(credit)) * 100)::bigint
    FROM public.journal_entry_lines
    WHERE journal_entry_id = v_je_id
  ) <> 0 THEN
    RAISE EXCEPTION 'Journal entry verification failed';
  END IF;

  RETURN bill_id_param;
END;
$$;

REVOKE ALL ON FUNCTION public.update_approved_bill_atomic(uuid, date, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_approved_bill_atomic(uuid, date, jsonb) TO authenticated, service_role;