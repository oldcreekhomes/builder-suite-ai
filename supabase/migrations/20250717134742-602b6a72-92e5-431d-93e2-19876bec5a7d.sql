-- Phase 1: Create project_folders table to explicitly track folders
CREATE TABLE public.project_folders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL,
  folder_path TEXT NOT NULL,
  parent_path TEXT,
  folder_name TEXT NOT NULL,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(project_id, folder_path)
);

-- Enable RLS
ALTER TABLE public.project_folders ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Company users can access all company folders" 
ON public.project_folders 
FOR ALL 
USING (get_current_user_company() IS NOT NULL)
WITH CHECK (get_current_user_company() IS NOT NULL);

-- Add foreign key constraint
ALTER TABLE public.project_folders 
ADD CONSTRAINT fk_project_folders_project_id 
FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_project_folders_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_project_folders_updated_at
BEFORE UPDATE ON public.project_folders
FOR EACH ROW
EXECUTE FUNCTION public.update_project_folders_updated_at();

-- Create index for better performance
CREATE INDEX idx_project_folders_project_id ON public.project_folders(project_id);
CREATE INDEX idx_project_folders_parent_path ON public.project_folders(parent_path);