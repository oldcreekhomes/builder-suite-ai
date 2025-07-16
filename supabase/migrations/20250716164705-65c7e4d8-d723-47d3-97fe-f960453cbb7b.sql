-- Check and update storage policies for project-files bucket
-- First, let's ensure the bucket exists and has proper policies

-- Create policies for the project-files bucket to allow uploads
CREATE POLICY "Users can upload to project-files proposals folder" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'project-files' 
  AND (storage.foldername(name))[1] = 'proposals'
  AND auth.uid() IS NOT NULL
);

CREATE POLICY "Users can read from project-files proposals folder" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'project-files' 
  AND (storage.foldername(name))[1] = 'proposals'
  AND auth.uid() IS NOT NULL
);

CREATE POLICY "Users can update project-files proposals folder" 
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'project-files' 
  AND (storage.foldername(name))[1] = 'proposals'
  AND auth.uid() IS NOT NULL
);

CREATE POLICY "Users can delete from project-files proposals folder" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'project-files' 
  AND (storage.foldername(name))[1] = 'proposals'
  AND auth.uid() IS NOT NULL
);