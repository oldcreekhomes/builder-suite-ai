
-- Drop existing INSERT, DELETE, and SELECT policies on bill_attachments
DROP POLICY IF EXISTS "Users can insert bill attachments" ON public.bill_attachments;
DROP POLICY IF EXISTS "Users can delete bill attachments" ON public.bill_attachments;
DROP POLICY IF EXISTS "Users can view bill attachments" ON public.bill_attachments;

-- Recreate INSERT policy: owner OR confirmed employee/accountant of the same company
CREATE POLICY "Users can insert bill attachments"
ON public.bill_attachments
FOR INSERT
WITH CHECK (
  -- Via approved bill
  (
    bill_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.bills b
      WHERE b.id = bill_id
        AND (
          b.owner_id = auth.uid()
          OR b.owner_id IN (
            SELECT home_builder_id FROM public.users
            WHERE id = auth.uid()
              AND confirmed = true
              AND role IN ('employee', 'accountant')
          )
        )
    )
  )
  OR
  -- Via pending upload
  (
    pending_upload_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.pending_bill_uploads pbu
      WHERE pbu.id = pending_upload_id
        AND (
          pbu.owner_id = auth.uid()
          OR pbu.owner_id IN (
            SELECT home_builder_id FROM public.users
            WHERE id = auth.uid()
              AND confirmed = true
              AND role IN ('employee', 'accountant')
          )
        )
    )
  )
);

-- Recreate DELETE policy: owner OR confirmed employee/accountant of the same company
CREATE POLICY "Users can delete bill attachments"
ON public.bill_attachments
FOR DELETE
USING (
  -- Via approved bill
  (
    bill_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.bills b
      WHERE b.id = bill_id
        AND (
          b.owner_id = auth.uid()
          OR b.owner_id IN (
            SELECT home_builder_id FROM public.users
            WHERE id = auth.uid()
              AND confirmed = true
              AND role IN ('employee', 'accountant')
          )
        )
    )
  )
  OR
  -- Via pending upload
  (
    pending_upload_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.pending_bill_uploads pbu
      WHERE pbu.id = pending_upload_id
        AND (
          pbu.owner_id = auth.uid()
          OR pbu.owner_id IN (
            SELECT home_builder_id FROM public.users
            WHERE id = auth.uid()
              AND confirmed = true
              AND role IN ('employee', 'accountant')
          )
        )
    )
  )
);

-- Recreate SELECT policy: owner OR confirmed employee/accountant of the same company
CREATE POLICY "Users can view bill attachments"
ON public.bill_attachments
FOR SELECT
USING (
  -- Via approved bill
  (
    bill_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.bills b
      WHERE b.id = bill_id
        AND (
          b.owner_id = auth.uid()
          OR b.owner_id IN (
            SELECT home_builder_id FROM public.users
            WHERE id = auth.uid()
              AND confirmed = true
              AND role IN ('employee', 'accountant')
          )
        )
    )
  )
  OR
  -- Via pending upload (pre-approval attachments)
  (
    pending_upload_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.pending_bill_uploads pbu
      WHERE pbu.id = pending_upload_id
        AND (
          pbu.owner_id = auth.uid()
          OR pbu.owner_id IN (
            SELECT home_builder_id FROM public.users
            WHERE id = auth.uid()
              AND confirmed = true
              AND role IN ('employee', 'accountant')
          )
        )
    )
  )
);
