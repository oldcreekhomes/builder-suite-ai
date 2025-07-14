-- Enable RLS on project_photos table
ALTER TABLE public.project_photos ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for project_photos that allows access based on project ownership
-- Users can view photos from projects they own or that belong to their home builder
CREATE POLICY "Users can view photos from their projects" 
ON public.project_photos 
FOR SELECT 
USING (
  project_id IN (
    SELECT id FROM public.projects
    WHERE owner_id = auth.uid() 
       OR owner_id IN (
         SELECT home_builder_id 
         FROM public.users 
         WHERE id = auth.uid() 
           AND role = 'employee' 
           AND confirmed = true
       )
  )
);

-- Allow users to insert photos to their own projects
CREATE POLICY "Users can insert photos to their projects" 
ON public.project_photos 
FOR INSERT 
WITH CHECK (
  project_id IN (
    SELECT id FROM public.projects
    WHERE owner_id = auth.uid() 
       OR owner_id IN (
         SELECT home_builder_id 
         FROM public.users 
         WHERE id = auth.uid() 
           AND role = 'employee' 
           AND confirmed = true
       )
  )
);

-- Allow users to update photos in their own projects
CREATE POLICY "Users can update photos in their projects" 
ON public.project_photos 
FOR UPDATE 
USING (
  project_id IN (
    SELECT id FROM public.projects
    WHERE owner_id = auth.uid() 
       OR owner_id IN (
         SELECT home_builder_id 
         FROM public.users 
         WHERE id = auth.uid() 
           AND role = 'employee' 
           AND confirmed = true
       )
  )
);

-- Allow users to delete photos from their own projects
CREATE POLICY "Users can delete photos from their projects" 
ON public.project_photos 
FOR DELETE 
USING (
  project_id IN (
    SELECT id FROM public.projects
    WHERE owner_id = auth.uid() 
       OR owner_id IN (
         SELECT home_builder_id 
         FROM public.users 
         WHERE id = auth.uid() 
           AND role = 'employee' 
           AND confirmed = true
       )
  )
);