CREATE OR REPLACE FUNCTION public.approve_pending_bill(pending_upload_id_param uuid, vendor_id_param uuid, project_id_param uuid, bill_date_param date, due_date_param date DEFAULT NULL::date, reference_number_param text DEFAULT NULL::text, terms_param text DEFAULT NULL::text, notes_param text DEFAULT NULL::text, review_notes_param text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  new_bill_id uuid;
  pending_owner_id uuid;
  total_amt numeric;
  line_record record;
  pending_upload_record record;
  vendor_name_var text;
  has_pending_attachments boolean;
BEGIN
  SELECT owner_id, file_name, file_path, file_size, content_type, uploaded_by
  INTO pending_upload_record
  FROM pending_bill_uploads
  WHERE id = pending_upload_id_param;

  IF pending_upload_record.owner_id IS NULL THEN
    RAISE EXCEPTION 'Pending bill upload not found';
  END IF;

  pending_owner_id := pending_upload_record.owner_id;

  SELECT company_name INTO vendor_name_var
  FROM companies WHERE id = vendor_id_param;

  SELECT COALESCE(SUM(ROUND(amount, 2)), 0) INTO total_amt
  FROM pending_bill_lines 
  WHERE pending_upload_id = pending_upload_id_param
    AND amount IS NOT NULL AND amount != 0;

  INSERT INTO bills (
    owner_id, vendor_id, project_id, bill_date, due_date,
    reference_number, terms, notes, total_amount, status, created_by
  ) VALUES (
    pending_owner_id, vendor_id_param, project_id_param, bill_date_param, due_date_param,
    reference_number_param, terms_param, notes_param, total_amt, 'draft', auth.uid()
  )
  RETURNING id INTO new_bill_id;

  FOR line_record IN 
    SELECT * FROM pending_bill_lines 
    WHERE pending_upload_id = pending_upload_id_param ORDER BY line_number
  LOOP
    IF line_record.amount IS NULL OR line_record.amount = 0 THEN
      CONTINUE;
    END IF;

    INSERT INTO bill_lines (
      bill_id, owner_id, line_number, line_type, account_id,
      cost_code_id, project_id, lot_id, quantity, unit_cost, amount, memo,
      purchase_order_id, po_reference
    ) VALUES (
      new_bill_id, pending_owner_id, line_record.line_number,
      line_record.line_type::bill_line_type, line_record.account_id,
      line_record.cost_code_id, COALESCE(line_record.project_id, project_id_param),
      line_record.lot_id, line_record.quantity, line_record.unit_cost,
      ROUND(line_record.amount, 2), COALESCE(line_record.memo, line_record.description),
      line_record.purchase_order_id, line_record.po_reference
    );

    IF line_record.description IS NOT NULL 
       AND line_record.description != '' 
       AND (line_record.account_id IS NOT NULL OR line_record.cost_code_id IS NOT NULL) 
    THEN
      INSERT INTO bill_categorization_examples (
        owner_id, vendor_name, description, account_id, account_name,
        cost_code_id, cost_code_name
      ) VALUES (
        pending_owner_id, vendor_name_var, line_record.description,
        line_record.account_id, line_record.account_name,
        line_record.cost_code_id, line_record.cost_code_name
      );
    END IF;
  END LOOP;

  SELECT EXISTS(
    SELECT 1 FROM bill_attachments WHERE pending_upload_id = pending_upload_id_param
  ) INTO has_pending_attachments;

  IF has_pending_attachments THEN
    UPDATE bill_attachments
    SET bill_id = new_bill_id,
        pending_upload_id = NULL
    WHERE pending_upload_id = pending_upload_id_param;
  ELSIF pending_upload_record.file_name IS NOT NULL AND pending_upload_record.file_name != '' THEN
    INSERT INTO bill_attachments (
      bill_id, file_name, file_path, file_size, content_type, uploaded_by
    ) VALUES (
      new_bill_id, pending_upload_record.file_name, pending_upload_record.file_path,
      COALESCE(pending_upload_record.file_size, 0),
      COALESCE(pending_upload_record.content_type, 'application/pdf'),
      pending_upload_record.uploaded_by
    );
  END IF;

  UPDATE pending_bill_uploads
  SET status = 'approved', reviewed_by = auth.uid(), reviewed_at = now(),
      review_notes = review_notes_param
  WHERE id = pending_upload_id_param;

  RETURN new_bill_id;
END;
$function$;