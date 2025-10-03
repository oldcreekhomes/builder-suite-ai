-- Add new columns to pending_bill_uploads table
ALTER TABLE public.pending_bill_uploads
ADD COLUMN IF NOT EXISTS reviewed_by uuid REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS reviewed_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS review_notes text;

-- Update status enum to include reviewing, approved, rejected
-- First, add new values to existing rows if needed
ALTER TABLE public.pending_bill_uploads 
ALTER COLUMN status TYPE text;

-- Create pending_bill_lines table
CREATE TABLE IF NOT EXISTS public.pending_bill_lines (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pending_upload_id uuid NOT NULL REFERENCES public.pending_bill_uploads(id) ON DELETE CASCADE,
  line_number integer NOT NULL DEFAULT 1,
  line_type text NOT NULL CHECK (line_type IN ('job_cost', 'expense')),
  description text,
  account_name text,
  cost_code_name text,
  project_name text,
  account_id uuid REFERENCES public.accounts(id),
  cost_code_id uuid REFERENCES public.cost_codes(id),
  project_id uuid REFERENCES public.projects(id),
  quantity numeric DEFAULT 1,
  unit_cost numeric DEFAULT 0,
  amount numeric NOT NULL DEFAULT 0,
  memo text,
  owner_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on pending_bill_lines
ALTER TABLE public.pending_bill_lines ENABLE ROW LEVEL SECURITY;

-- RLS policies for pending_bill_lines (same as bill_lines)
CREATE POLICY "Pending bill lines visible to owner and confirmed employees"
ON public.pending_bill_lines
FOR SELECT
USING (
  owner_id = auth.uid() OR 
  owner_id IN (
    SELECT u.home_builder_id 
    FROM users u 
    WHERE u.id = auth.uid() 
    AND u.confirmed = true 
    AND u.role = 'employee'
  )
);

CREATE POLICY "Pending bill lines insert limited to owner and confirmed employees"
ON public.pending_bill_lines
FOR INSERT
WITH CHECK (
  owner_id = auth.uid() OR 
  owner_id IN (
    SELECT u.home_builder_id 
    FROM users u 
    WHERE u.id = auth.uid() 
    AND u.confirmed = true 
    AND u.role = 'employee'
  )
);

CREATE POLICY "Pending bill lines update limited to owner and confirmed employees"
ON public.pending_bill_lines
FOR UPDATE
USING (
  owner_id = auth.uid() OR 
  owner_id IN (
    SELECT u.home_builder_id 
    FROM users u 
    WHERE u.id = auth.uid() 
    AND u.confirmed = true 
    AND u.role = 'employee'
  )
);

CREATE POLICY "Pending bill lines delete limited to owner and confirmed employees"
ON public.pending_bill_lines
FOR DELETE
USING (
  owner_id = auth.uid() OR 
  owner_id IN (
    SELECT u.home_builder_id 
    FROM users u 
    WHERE u.id = auth.uid() 
    AND u.confirmed = true 
    AND u.role = 'employee'
  )
);

-- Create trigger for pending_bill_lines updated_at
CREATE OR REPLACE FUNCTION public.update_pending_bill_lines_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_pending_bill_lines_updated_at
BEFORE UPDATE ON public.pending_bill_lines
FOR EACH ROW
EXECUTE FUNCTION public.update_pending_bill_lines_updated_at();

-- Function to approve a pending bill and create actual bill records
CREATE OR REPLACE FUNCTION public.approve_pending_bill(
  pending_upload_id_param uuid,
  vendor_id_param uuid,
  bill_date_param date,
  due_date_param date,
  reference_number_param text DEFAULT NULL,
  terms_param text DEFAULT NULL,
  notes_param text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  new_bill_id uuid;
  pending_owner_id uuid;
  total_amt numeric;
  line_record record;
BEGIN
  -- Get owner_id from pending upload
  SELECT owner_id INTO pending_owner_id
  FROM pending_bill_uploads
  WHERE id = pending_upload_id_param;

  IF pending_owner_id IS NULL THEN
    RAISE EXCEPTION 'Pending bill upload not found';
  END IF;

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

  -- Create bill lines from pending lines
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
  END LOOP;

  -- Mark pending upload as approved
  UPDATE pending_bill_uploads
  SET status = 'approved',
      reviewed_by = auth.uid(),
      reviewed_at = now()
  WHERE id = pending_upload_id_param;

  RETURN new_bill_id;
END;
$$;

-- Function to reject a pending bill
CREATE OR REPLACE FUNCTION public.reject_pending_bill(
  pending_upload_id_param uuid,
  review_notes_param text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE pending_bill_uploads
  SET status = 'rejected',
      reviewed_by = auth.uid(),
      reviewed_at = now(),
      review_notes = review_notes_param
  WHERE id = pending_upload_id_param;

  -- Delete associated pending lines
  DELETE FROM pending_bill_lines
  WHERE pending_upload_id = pending_upload_id_param;

  RETURN FOUND;
END;
$$;