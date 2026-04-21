-- Drop the old per-uploader policies on the pending/ folder of bill-attachments
DROP POLICY IF EXISTS "Users can read from their pending folder" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete from their pending folder" ON storage.objects;

-- New SELECT policy: any confirmed user in the same home builder/tenant
-- as the pending_bill_uploads.owner_id can read the file.
CREATE POLICY "Pending bill files viewable by tenant"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'bill-attachments'
  AND (storage.foldername(name))[1] = 'pending'
  AND EXISTS (
    SELECT 1
    FROM public.pending_bill_uploads pu
    WHERE pu.file_path = storage.objects.name
      AND (
        -- The owner (home builder) themselves
        pu.owner_id = auth.uid()
        -- Or a confirmed employee of that home builder
        OR pu.owner_id IN (
          SELECT u.home_builder_id
          FROM public.users u
          WHERE u.id = auth.uid()
            AND u.confirmed = true
            AND u.home_builder_id IS NOT NULL
        )
      )
  )
);

-- New DELETE policy: same tenant boundary
CREATE POLICY "Pending bill files deletable by tenant"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'bill-attachments'
  AND (storage.foldername(name))[1] = 'pending'
  AND EXISTS (
    SELECT 1
    FROM public.pending_bill_uploads pu
    WHERE pu.file_path = storage.objects.name
      AND (
        pu.owner_id = auth.uid()
        OR pu.owner_id IN (
          SELECT u.home_builder_id
          FROM public.users u
          WHERE u.id = auth.uid()
            AND u.confirmed = true
            AND u.home_builder_id IS NOT NULL
        )
      )
  )
);
