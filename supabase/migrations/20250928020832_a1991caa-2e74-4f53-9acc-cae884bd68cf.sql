-- Create bill_attachments table
CREATE TABLE public.bill_attachments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  bill_id UUID REFERENCES public.bills(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  content_type TEXT DEFAULT 'application/pdf',
  uploaded_by UUID NOT NULL,
  uploaded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.bill_attachments ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Bill attachments visible to owner and confirmed employees" 
ON public.bill_attachments 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.bills b 
    WHERE b.id = bill_id 
    AND (
      b.owner_id = auth.uid() 
      OR b.owner_id IN (
        SELECT u.home_builder_id
        FROM public.users u
        WHERE u.id = auth.uid() 
        AND u.confirmed = true 
        AND u.role = 'employee'
      )
    )
  )
);

CREATE POLICY "Bill attachments insert limited to owner and confirmed employees" 
ON public.bill_attachments 
FOR INSERT 
WITH CHECK (
  uploaded_by = auth.uid() 
  AND EXISTS (
    SELECT 1 FROM public.bills b 
    WHERE b.id = bill_id 
    AND (
      b.owner_id = auth.uid() 
      OR b.owner_id IN (
        SELECT u.home_builder_id
        FROM public.users u
        WHERE u.id = auth.uid() 
        AND u.confirmed = true 
        AND u.role = 'employee'
      )
    )
  )
);

CREATE POLICY "Bill attachments delete limited to owner and confirmed employees" 
ON public.bill_attachments 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.bills b 
    WHERE b.id = bill_id 
    AND (
      b.owner_id = auth.uid() 
      OR b.owner_id IN (
        SELECT u.home_builder_id
        FROM public.users u
        WHERE u.id = auth.uid() 
        AND u.confirmed = true 
        AND u.role = 'employee'
      )
    )
  )
);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_bill_attachments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_bill_attachments_updated_at
BEFORE UPDATE ON public.bill_attachments
FOR EACH ROW
EXECUTE FUNCTION public.update_bill_attachments_updated_at();

-- Create storage bucket for bill attachments
INSERT INTO storage.buckets (id, name, public) VALUES ('bill-attachments', 'bill-attachments', false);

-- Create storage policies
CREATE POLICY "Bill attachment files are viewable by authenticated users with access to the bill" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'bill-attachments' 
  AND EXISTS (
    SELECT 1 FROM public.bill_attachments ba
    JOIN public.bills b ON ba.bill_id = b.id
    WHERE ba.file_path = name
    AND (
      b.owner_id = auth.uid() 
      OR b.owner_id IN (
        SELECT u.home_builder_id
        FROM public.users u
        WHERE u.id = auth.uid() 
        AND u.confirmed = true 
        AND u.role = 'employee'
      )
    )
  )
);

CREATE POLICY "Users can upload bill attachment files" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'bill-attachments' 
  AND auth.uid() IS NOT NULL
);

CREATE POLICY "Users can delete their bill attachment files" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'bill-attachments' 
  AND EXISTS (
    SELECT 1 FROM public.bill_attachments ba
    JOIN public.bills b ON ba.bill_id = b.id
    WHERE ba.file_path = name
    AND (
      b.owner_id = auth.uid() 
      OR b.owner_id IN (
        SELECT u.home_builder_id
        FROM public.users u
        WHERE u.id = auth.uid() 
        AND u.confirmed = true 
        AND u.role = 'employee'
      )
    )
  )
);