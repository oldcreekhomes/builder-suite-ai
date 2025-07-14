-- Create RLS policies for project_files table to work with unified users table

-- Create policy for file access (SELECT)
CREATE POLICY "Users can view files from their projects" 
ON public.project_files 
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

-- Create policy for file upload (INSERT)
CREATE POLICY "Users can upload files to their projects" 
ON public.project_files 
FOR INSERT 
WITH CHECK (
  uploaded_by = auth.uid() AND
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

-- Create policy for file updates (UPDATE)
CREATE POLICY "Users can update files in their projects" 
ON public.project_files 
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

-- Create policy for file deletion (DELETE)
CREATE POLICY "Users can delete files from their projects" 
ON public.project_files 
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

-- Update storage policies to work with the unified users table structure
-- Drop old storage policies that might reference the old table structure
DROP POLICY IF EXISTS "Authenticated users can view project files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload project files" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own project files" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own project files" ON storage.objects;

-- Create new storage policies for project-files bucket
CREATE POLICY "Users can view files from their projects" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'project-files' AND
  (storage.foldername(name))[1] IN (
    SELECT pf.project_id::text
    FROM public.project_files pf
    JOIN public.projects p ON pf.project_id = p.id
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
  (storage.foldername(name))[1] IN (
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
  (storage.foldername(name))[1] IN (
    SELECT pf.project_id::text
    FROM public.project_files pf
    JOIN public.projects p ON pf.project_id = p.id
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
  (storage.foldername(name))[1] IN (
    SELECT pf.project_id::text
    FROM public.project_files pf
    JOIN public.projects p ON pf.project_id = p.id
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