CREATE POLICY "Pending bill files updatable by tenant"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'bill-attachments'
  AND (storage.foldername(name))[1] = 'pending'
  AND (
    (storage.foldername(name))[2] = (auth.uid())::text
    OR EXISTS (
      SELECT 1 FROM public.pending_bill_uploads pu
      WHERE pu.file_path = storage.objects.name
        AND (
          pu.owner_id = auth.uid()
          OR pu.owner_id IN (
            SELECT u.home_builder_id FROM public.users u
            WHERE u.id = auth.uid() AND u.confirmed = true AND u.home_builder_id IS NOT NULL
          )
        )
    )
  )
)
WITH CHECK (
  bucket_id = 'bill-attachments'
  AND (storage.foldername(name))[1] = 'pending'
  AND (
    (storage.foldername(name))[2] = (auth.uid())::text
    OR EXISTS (
      SELECT 1 FROM public.pending_bill_uploads pu
      WHERE pu.file_path = storage.objects.name
        AND (
          pu.owner_id = auth.uid()
          OR pu.owner_id IN (
            SELECT u.home_builder_id FROM public.users u
            WHERE u.id = auth.uid() AND u.confirmed = true AND u.home_builder_id IS NOT NULL
          )
        )
    )
  )
);