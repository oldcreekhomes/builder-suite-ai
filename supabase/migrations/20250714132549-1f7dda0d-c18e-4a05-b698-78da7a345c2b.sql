-- Fix storage policies to match the actual folder structure used in the application
-- The current structure is: {userId}/{projectId}/{fileId}_{filename}

-- Drop the current storage policies that have incorrect path logic
DROP POLICY IF EXISTS "Users can view files from their projects" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload files to their projects" ON storage.objects;
DROP POLICY IF EXISTS "Users can update files in their projects" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete files from their projects" ON storage.objects;

-- Create corrected storage policies for project-files bucket
-- The folder structure is: userId/projectId/... so (storage.foldername(name))[2] is the project ID

CREATE POLICY "Users can view files from their projects" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'project-files' AND
  (storage.foldername(name))[2] IN (
    SELECT p.id::text
    FROM public.projects p
    WHERE p.owner_id = auth.uid() 
       OR p.owner_id IN (
         SELECT home_builder_id 
         FROM public.users 
         WHERE id = auth.uid() 
           AND role = 'employee' 
           AND confirmed = true
       )
  )
);

CREATE POLICY "Users can upload files to their projects" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'project-files' AND
  (storage.foldername(name))[1] = auth.uid()::text AND
  (storage.foldername(name))[2] IN (
    SELECT p.id::text
    FROM public.projects p
    WHERE p.owner_id = auth.uid() 
       OR p.owner_id IN (
         SELECT home_builder_id 
         FROM public.users 
         WHERE id = auth.uid() 
           AND role = 'employee' 
           AND confirmed = true
       )
  )
);

CREATE POLICY "Users can update files in their projects" 
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'project-files' AND
  (storage.foldername(name))[2] IN (
    SELECT p.id::text
    FROM public.projects p
    WHERE p.owner_id = auth.uid() 
       OR p.owner_id IN (
         SELECT home_builder_id 
         FROM public.users 
         WHERE id = auth.uid() 
           AND role = 'employee' 
           AND confirmed = true
       )
  )
);

CREATE POLICY "Users can delete files from their projects" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'project-files' AND
  (storage.foldername(name))[2] IN (
    SELECT p.id::text
    FROM public.projects p
    WHERE p.owner_id = auth.uid() 
       OR p.owner_id IN (
         SELECT home_builder_id 
         FROM public.users 
         WHERE id = auth.uid() 
           AND role = 'employee' 
           AND confirmed = true
       )
  )
);