DROP POLICY IF EXISTS "Users can read from their pending folder" ON storage.objects;

CREATE POLICY "Users can read from their pending folder"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'bill-attachments'
  AND (storage.foldername(name))[1] = 'pending'
  AND (storage.foldername(name))[2] = auth.uid()::text
);

DROP POLICY IF EXISTS "Users can delete from their pending folder" ON storage.objects;

CREATE POLICY "Users can delete from their pending folder"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'bill-attachments'
  AND (storage.foldername(name))[1] = 'pending'
  AND (storage.foldername(name))[2] = auth.uid()::text
);