-- Create table for storing bill categorization examples for AI learning
CREATE TABLE IF NOT EXISTS public.bill_categorization_examples (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id uuid NOT NULL,
  vendor_name text NOT NULL,
  description text NOT NULL,
  account_id uuid,
  account_name text,
  cost_code_id uuid,
  cost_code_name text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create index for fast vendor lookups
CREATE INDEX IF NOT EXISTS idx_bill_categorization_examples_owner_vendor 
ON public.bill_categorization_examples(owner_id, vendor_name);

-- Enable RLS
ALTER TABLE public.bill_categorization_examples ENABLE ROW LEVEL SECURITY;

-- RLS policy: Company-wide read access (owner and confirmed employees)
CREATE POLICY "Categorization examples visible to company"
ON public.bill_categorization_examples
FOR SELECT
USING (
  (owner_id = auth.uid()) OR 
  (owner_id IN (
    SELECT u.home_builder_id 
    FROM public.users u 
    WHERE u.id = auth.uid() 
      AND u.confirmed = true 
      AND u.role = 'employee'
  ))
);

-- RLS policy: Only system can insert (via approve_pending_bill function)
CREATE POLICY "System can insert categorization examples"
ON public.bill_categorization_examples
FOR INSERT
WITH CHECK (true);

-- Update approve_pending_bill function to store categorization examples
CREATE OR REPLACE FUNCTION public.approve_pending_bill(
  pending_upload_id_param uuid, 
  vendor_id_param uuid, 
  bill_date_param date, 
  due_date_param date, 
  reference_number_param text DEFAULT NULL::text, 
  terms_param text DEFAULT NULL::text, 
  notes_param text DEFAULT NULL::text
)
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
BEGIN
  -- Get owner_id and file info from pending upload
  SELECT owner_id, file_name, file_path, file_size, content_type, uploaded_by
  INTO pending_upload_record
  FROM pending_bill_uploads
  WHERE id = pending_upload_id_param;

  IF pending_upload_record.owner_id IS NULL THEN
    RAISE EXCEPTION 'Pending bill upload not found';
  END IF;

  pending_owner_id := pending_upload_record.owner_id;

  -- Get vendor name for learning examples
  SELECT company_name INTO vendor_name_var
  FROM companies
  WHERE id = vendor_id_param;

  -- Calculate total from pending lines
  SELECT COALESCE(SUM(amount), 0) INTO total_amt
  FROM pending_bill_lines
  WHERE pending_upload_id = pending_upload_id_param;

  -- Create the bill
  INSERT INTO bills (
    owner_id,
    vendor_id,
    bill_date,
    due_date,
    reference_number,
    terms,
    notes,
    total_amount,
    status,
    created_by
  ) VALUES (
    pending_owner_id,
    vendor_id_param,
    bill_date_param,
    due_date_param,
    reference_number_param,
    terms_param,
    notes_param,
    total_amt,
    'draft',
    auth.uid()
  )
  RETURNING id INTO new_bill_id;

  -- Create bill lines from pending lines AND store as learning examples
  FOR line_record IN 
    SELECT * FROM pending_bill_lines 
    WHERE pending_upload_id = pending_upload_id_param
    ORDER BY line_number
  LOOP
    INSERT INTO bill_lines (
      bill_id,
      owner_id,
      line_number,
      line_type,
      account_id,
      cost_code_id,
      project_id,
      quantity,
      unit_cost,
      amount,
      memo
    ) VALUES (
      new_bill_id,
      pending_owner_id,
      line_record.line_number,
      line_record.line_type::bill_line_type,
      line_record.account_id,
      line_record.cost_code_id,
      line_record.project_id,
      line_record.quantity,
      line_record.unit_cost,
      line_record.amount,
      line_record.memo
    );

    -- Store as learning example if it has a description and categorization
    IF line_record.description IS NOT NULL 
       AND line_record.description != '' 
       AND (line_record.account_id IS NOT NULL OR line_record.cost_code_id IS NOT NULL) 
    THEN
      INSERT INTO bill_categorization_examples (
        owner_id,
        vendor_name,
        description,
        account_id,
        account_name,
        cost_code_id,
        cost_code_name
      ) VALUES (
        pending_owner_id,
        vendor_name_var,
        line_record.description,
        line_record.account_id,
        line_record.account_name,
        line_record.cost_code_id,
        line_record.cost_code_name
      );
    END IF;
  END LOOP;

  -- Create bill attachment record linking to the original uploaded file
  INSERT INTO bill_attachments (
    bill_id,
    file_name,
    file_path,
    file_size,
    content_type,
    uploaded_by
  ) VALUES (
    new_bill_id,
    pending_upload_record.file_name,
    pending_upload_record.file_path,
    pending_upload_record.file_size,
    COALESCE(pending_upload_record.content_type, 'application/pdf'),
    pending_upload_record.uploaded_by
  );

  -- Mark pending upload as approved
  UPDATE pending_bill_uploads
  SET status = 'approved',
      reviewed_by = auth.uid(),
      reviewed_at = now()
  WHERE id = pending_upload_id_param;

  RETURN new_bill_id;
END;
$function$;