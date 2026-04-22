DO $$
DECLARE
  v_pending_upload_id uuid := '6d456070-efef-41ff-aabf-26d20fe78010';
  v_existing public.pending_bill_lines%ROWTYPE;
BEGIN
  SELECT *
  INTO v_existing
  FROM public.pending_bill_lines
  WHERE pending_upload_id = v_pending_upload_id
  ORDER BY line_number
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No pending_bill_lines found for pending upload %', v_pending_upload_id;
  END IF;

  DELETE FROM public.pending_bill_lines
  WHERE pending_upload_id = v_pending_upload_id;

  INSERT INTO public.pending_bill_lines (
    pending_upload_id,
    owner_id,
    line_number,
    line_type,
    description,
    memo,
    account_id,
    account_name,
    cost_code_id,
    cost_code_name,
    project_id,
    project_name,
    quantity,
    unit_cost,
    amount,
    purchase_order_id,
    purchase_order_line_id,
    po_assignment,
    po_reference,
    lot_id
  )
  VALUES
    (
      v_pending_upload_id,
      v_existing.owner_id,
      1,
      'job_cost',
      '115 E Oceanwatch Ct Nags Head NC\nSiding labor balance',
      '115 E Oceanwatch Ct Nags Head NC\nSiding labor balance',
      NULL,
      NULL,
      '23dcbebf-2c94-48a4-b105-49313169242e',
      '4470: Siding',
      v_existing.project_id,
      NULL,
      1,
      10268.00,
      10268.00,
      '3f63b122-7db3-4cd6-9bc8-3d0f04204be2',
      'a1542273-ac6a-4797-b523-3ab24833ab51',
      'auto',
      NULL,
      v_existing.lot_id
    ),
    (
      v_pending_upload_id,
      v_existing.owner_id,
      2,
      'job_cost',
      'PVC around bottom labor',
      'PVC around bottom labor',
      NULL,
      NULL,
      '7b8891c6-9f68-412b-9040-36b3e053ada8',
      '4400: Exterior Trim / Cornice',
      v_existing.project_id,
      NULL,
      1,
      400.00,
      400.00,
      NULL,
      NULL,
      'none',
      NULL,
      v_existing.lot_id
    ),
    (
      v_pending_upload_id,
      v_existing.owner_id,
      3,
      'job_cost',
      'Rip backing behind 1x4 trim',
      'Rip backing behind 1x4 trim',
      NULL,
      NULL,
      '7b8891c6-9f68-412b-9040-36b3e053ada8',
      '4400: Exterior Trim / Cornice',
      v_existing.project_id,
      NULL,
      1,
      400.00,
      400.00,
      NULL,
      NULL,
      'none',
      NULL,
      v_existing.lot_id
    ),
    (
      v_pending_upload_id,
      v_existing.owner_id,
      4,
      'job_cost',
      'Paper re installation around all house',
      'Paper re installation around all house',
      NULL,
      NULL,
      '86ac94c9-93eb-49de-a232-c999bb2f8f8a',
      '4375: Tyvek Installation',
      v_existing.project_id,
      NULL,
      1,
      500.00,
      500.00,
      NULL,
      NULL,
      'none',
      NULL,
      v_existing.lot_id
    );

  UPDATE public.pending_bill_uploads
  SET extracted_data = jsonb_set(
    COALESCE(extracted_data, '{}'::jsonb),
    '{line_items}',
    jsonb_build_array(
      jsonb_build_object(
        'description', '115 E Oceanwatch Ct Nags Head NC\nSiding labor balance',
        'quantity', 1,
        'unit_cost', 10268.00,
        'amount', 10268.00,
        'memo', '115 E Oceanwatch Ct Nags Head NC\nSiding labor balance',
        'cost_code_name', '4470: Siding',
        'account_name', NULL,
        'po_reference', NULL,
        'line_type', 'job_cost'
      ),
      jsonb_build_object(
        'description', 'PVC around bottom labor',
        'quantity', 1,
        'unit_cost', 400.00,
        'amount', 400.00,
        'memo', 'PVC around bottom labor',
        'cost_code_name', '4400: Exterior Trim / Cornice',
        'account_name', NULL,
        'po_reference', NULL,
        'line_type', 'job_cost'
      ),
      jsonb_build_object(
        'description', 'Rip backing behind 1x4 trim',
        'quantity', 1,
        'unit_cost', 400.00,
        'amount', 400.00,
        'memo', 'Rip backing behind 1x4 trim',
        'cost_code_name', '4400: Exterior Trim / Cornice',
        'account_name', NULL,
        'po_reference', NULL,
        'line_type', 'job_cost'
      ),
      jsonb_build_object(
        'description', 'Paper re installation around all house',
        'quantity', 1,
        'unit_cost', 500.00,
        'amount', 500.00,
        'memo', 'Paper re installation around all house',
        'cost_code_name', '4375: Tyvek Installation',
        'account_name', NULL,
        'po_reference', NULL,
        'line_type', 'job_cost'
      )
    ),
    true
  )
  WHERE id = v_pending_upload_id;
END $$;