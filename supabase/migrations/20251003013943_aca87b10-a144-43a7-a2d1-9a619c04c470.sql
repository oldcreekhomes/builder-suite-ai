-- Add Storage RLS policies for bill-attachments bucket to allow authenticated users
-- to upload/read/delete files in pending/{auth.uid}/ path

-- Policy: Allow users to upload files to their own pending folder
CREATE POLICY "Users can upload to their pending folder"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'bill-attachments' 
  AND (storage.foldername(name))[1] = 'pending'
  AND (storage.foldername(name))[2] = auth.uid()::text
);

-- Policy: Allow users to read files from their own pending folder
CREATE POLICY "Users can read from their pending folder"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'bill-attachments' 
  AND (storage.foldername(name))[1] = 'pending'
  AND (storage.foldername(name))[2] = auth.uid()::text
);

-- Policy: Allow users to delete files from their own pending folder
CREATE POLICY "Users can delete from their pending folder"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'bill-attachments' 
  AND (storage.foldername(name))[1] = 'pending'
  AND (storage.foldername(name))[2] = auth.uid()::text
);