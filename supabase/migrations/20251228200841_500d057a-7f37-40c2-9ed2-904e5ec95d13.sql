-- Create storage bucket for insurance certificates
INSERT INTO storage.buckets (id, name, public)
VALUES ('insurance-certificates', 'insurance-certificates', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for insurance certificates
CREATE POLICY "Users can upload insurance certificates"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'insurance-certificates' AND
  auth.uid() IS NOT NULL
);

CREATE POLICY "Users can view their company insurance certificates"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'insurance-certificates' AND
  auth.uid() IS NOT NULL
);

CREATE POLICY "Users can delete their company insurance certificates"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'insurance-certificates' AND
  auth.uid() IS NOT NULL
);

-- Create pending insurance uploads table
CREATE TABLE public.pending_insurance_uploads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  content_type TEXT DEFAULT 'application/pdf',
  status TEXT NOT NULL DEFAULT 'pending',
  extracted_data JSONB,
  error_message TEXT,
  owner_id UUID NOT NULL,
  uploaded_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.pending_insurance_uploads ENABLE ROW LEVEL SECURITY;

-- RLS policies for pending insurance uploads
CREATE POLICY "Pending insurance uploads visible to owner and confirmed employees"
ON public.pending_insurance_uploads FOR SELECT
USING (
  (owner_id = auth.uid()) OR 
  (owner_id IN (
    SELECT u.home_builder_id
    FROM users u
    WHERE u.id = auth.uid() AND u.confirmed = true AND u.role = ANY(ARRAY['employee', 'accountant'])
  ))
);

CREATE POLICY "Pending insurance uploads insert limited to owner and confirmed employees"
ON public.pending_insurance_uploads FOR INSERT
WITH CHECK (
  (owner_id = auth.uid()) OR 
  (owner_id IN (
    SELECT u.home_builder_id
    FROM users u
    WHERE u.id = auth.uid() AND u.confirmed = true AND u.role = ANY(ARRAY['employee', 'accountant'])
  ))
);

CREATE POLICY "Pending insurance uploads update limited to owner and confirmed employees"
ON public.pending_insurance_uploads FOR UPDATE
USING (
  (owner_id = auth.uid()) OR 
  (owner_id IN (
    SELECT u.home_builder_id
    FROM users u
    WHERE u.id = auth.uid() AND u.confirmed = true AND u.role = ANY(ARRAY['employee', 'accountant'])
  ))
);

CREATE POLICY "Pending insurance uploads delete limited to owner and confirmed employees"
ON public.pending_insurance_uploads FOR DELETE
USING (
  (owner_id = auth.uid()) OR 
  (owner_id IN (
    SELECT u.home_builder_id
    FROM users u
    WHERE u.id = auth.uid() AND u.confirmed = true AND u.role = ANY(ARRAY['employee', 'accountant'])
  ))
);

-- Trigger for updated_at
CREATE TRIGGER update_pending_insurance_uploads_updated_at
BEFORE UPDATE ON public.pending_insurance_uploads
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();