-- Create pending_bill_uploads table
CREATE TABLE IF NOT EXISTS public.pending_bill_uploads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  uploaded_by uuid NOT NULL,
  file_path text NOT NULL,
  file_name text NOT NULL,
  file_size bigint NOT NULL,
  content_type text DEFAULT 'application/pdf',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'extracted', 'error')),
  extracted_data jsonb,
  error_message text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.pending_bill_uploads ENABLE ROW LEVEL SECURITY;

-- RLS policies for pending_bill_uploads
CREATE POLICY "Pending uploads visible to owner and confirmed employees"
  ON public.pending_bill_uploads
  FOR SELECT
  USING (
    owner_id = auth.uid() OR 
    owner_id IN (
      SELECT u.home_builder_id 
      FROM users u 
      WHERE u.id = auth.uid() AND u.confirmed = true AND u.role = 'employee'
    )
  );

CREATE POLICY "Pending uploads insert limited to owner and confirmed employees"
  ON public.pending_bill_uploads
  FOR INSERT
  WITH CHECK (
    owner_id = auth.uid() OR 
    owner_id IN (
      SELECT u.home_builder_id 
      FROM users u 
      WHERE u.id = auth.uid() AND u.confirmed = true AND u.role = 'employee'
    )
  );

CREATE POLICY "Pending uploads update limited to owner and confirmed employees"
  ON public.pending_bill_uploads
  FOR UPDATE
  USING (
    owner_id = auth.uid() OR 
    owner_id IN (
      SELECT u.home_builder_id 
      FROM users u 
      WHERE u.id = auth.uid() AND u.confirmed = true AND u.role = 'employee'
    )
  );

CREATE POLICY "Pending uploads delete limited to owner and confirmed employees"
  ON public.pending_bill_uploads
  FOR DELETE
  USING (
    owner_id = auth.uid() OR 
    owner_id IN (
      SELECT u.home_builder_id 
      FROM users u 
      WHERE u.id = auth.uid() AND u.confirmed = true AND u.role = 'employee'
    )
  );

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_pending_bill_uploads_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_pending_bill_uploads_updated_at
  BEFORE UPDATE ON public.pending_bill_uploads
  FOR EACH ROW
  EXECUTE FUNCTION update_pending_bill_uploads_updated_at();