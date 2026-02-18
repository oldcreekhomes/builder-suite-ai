-- Add pending_upload_id column to bill_attachments
ALTER TABLE bill_attachments
  ADD COLUMN IF NOT EXISTS pending_upload_id uuid REFERENCES pending_bill_uploads(id) ON DELETE CASCADE;

-- Drop old policies if they exist to avoid conflicts, then recreate
DROP POLICY IF EXISTS "Users can insert bill_attachments for their pending uploads" ON bill_attachments;
DROP POLICY IF EXISTS "Users can view bill_attachments for their pending uploads" ON bill_attachments;
DROP POLICY IF EXISTS "Users can delete bill_attachments for their pending uploads" ON bill_attachments;

CREATE POLICY "Users can insert bill_attachments for their pending uploads"
  ON bill_attachments
  FOR INSERT
  WITH CHECK (
    pending_upload_id IS NULL
    OR EXISTS (
      SELECT 1 FROM pending_bill_uploads
      WHERE id = pending_upload_id
        AND owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete bill_attachments for their pending uploads"
  ON bill_attachments
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM pending_bill_uploads
      WHERE id = pending_upload_id
        AND owner_id = auth.uid()
    )
  );