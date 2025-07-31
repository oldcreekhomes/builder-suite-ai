-- Create storage bucket for issue files
INSERT INTO storage.buckets (id, name, public) VALUES ('issue-files', 'issue-files', true);

-- Create policies for issue files
CREATE POLICY "Anyone can view issue files" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'issue-files');

CREATE POLICY "Authenticated users can upload issue files" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'issue-files' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update issue files" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'issue-files' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete issue files" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'issue-files' AND auth.role() = 'authenticated');

-- Create issue_files table to track files associated with issues
CREATE TABLE public.issue_files (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  issue_id UUID NOT NULL REFERENCES public.company_issues(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size BIGINT,
  file_type TEXT,
  uploaded_by UUID REFERENCES auth.users(id),
  uploaded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.issue_files ENABLE ROW LEVEL SECURITY;

-- Create policies for issue_files
CREATE POLICY "Users can view issue files" 
ON public.issue_files 
FOR SELECT 
USING (true);

CREATE POLICY "Authenticated users can insert issue files" 
ON public.issue_files 
FOR INSERT 
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update issue files" 
ON public.issue_files 
FOR UPDATE 
USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete issue files" 
ON public.issue_files 
FOR DELETE 
USING (auth.role() = 'authenticated');