
-- Create a table for project files
CREATE TABLE public.project_files (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  original_filename TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  file_type TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  uploaded_by UUID NOT NULL REFERENCES public.profiles(id),
  uploaded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  description TEXT,
  is_deleted BOOLEAN NOT NULL DEFAULT false
);

-- Add Row Level Security (RLS)
ALTER TABLE public.project_files ENABLE ROW LEVEL SECURITY;

-- Create policies for project files
CREATE POLICY "Users can view files in their projects" 
  ON public.project_files 
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.projects 
      WHERE projects.id = project_files.project_id 
      AND projects.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can upload files to their projects" 
  ON public.project_files 
  FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.projects 
      WHERE projects.id = project_files.project_id 
      AND projects.owner_id = auth.uid()
    )
    AND auth.uid() = uploaded_by
  );

CREATE POLICY "Users can update files in their projects" 
  ON public.project_files 
  FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM public.projects 
      WHERE projects.id = project_files.project_id 
      AND projects.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete files in their projects" 
  ON public.project_files 
  FOR DELETE 
  USING (
    EXISTS (
      SELECT 1 FROM public.projects 
      WHERE projects.id = project_files.project_id 
      AND projects.owner_id = auth.uid()
    )
  );

-- Create storage bucket for project files
INSERT INTO storage.buckets (id, name, public)
VALUES ('project-files', 'project-files', false);

-- Create storage policies
CREATE POLICY "Users can view files in their projects" 
  ON storage.objects 
  FOR SELECT 
  USING (
    bucket_id = 'project-files' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can upload files to their projects" 
  ON storage.objects 
  FOR INSERT 
  WITH CHECK (
    bucket_id = 'project-files' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can update files in their projects" 
  ON storage.objects 
  FOR UPDATE 
  USING (
    bucket_id = 'project-files' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete files in their projects" 
  ON storage.objects 
  FOR DELETE 
  USING (
    bucket_id = 'project-files' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
