
-- Enable RLS on project_photos table
ALTER TABLE public.project_photos ENABLE ROW LEVEL SECURITY;

-- Create policies for project_photos
CREATE POLICY "Users can view photos in their projects" 
  ON public.project_photos 
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.projects 
      WHERE projects.id = project_photos.project_id 
      AND projects.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can upload photos to their projects" 
  ON public.project_photos 
  FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.projects 
      WHERE projects.id = project_photos.project_id 
      AND projects.owner_id = auth.uid()
    )
    AND auth.uid() = uploaded_by
  );

CREATE POLICY "Users can update photos in their projects" 
  ON public.project_photos 
  FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM public.projects 
      WHERE projects.id = project_photos.project_id 
      AND projects.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete photos in their projects" 
  ON public.project_photos 
  FOR DELETE 
  USING (
    EXISTS (
      SELECT 1 FROM public.projects 
      WHERE projects.id = project_photos.project_id 
      AND projects.owner_id = auth.uid()
    )
  );
