-- Drop existing role-restrictive policies
DROP POLICY IF EXISTS "Owners and employees can upload project files" ON storage.objects;
DROP POLICY IF EXISTS "Owners and employees can update project files" ON storage.objects;
DROP POLICY IF EXISTS "Owners and employees can delete project files" ON storage.objects;
DROP POLICY IF EXISTS "Owners and employees can view project files" ON storage.objects;

-- INSERT: Allow all confirmed company users to upload
CREATE POLICY "Company users can upload to project-files"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'project-files' AND
  EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.id = auth.uid()
    AND (
      u.role = 'owner' OR 
      (u.confirmed = true AND u.role IN ('employee', 'accountant'))
    )
  )
);

-- UPDATE: Allow all confirmed company users to update
CREATE POLICY "Company users can update in project-files"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'project-files' AND
  EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.id = auth.uid()
    AND (
      u.role = 'owner' OR 
      (u.confirmed = true AND u.role IN ('employee', 'accountant'))
    )
  )
);

-- DELETE: Allow all confirmed company users to delete
CREATE POLICY "Company users can delete from project-files"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'project-files' AND
  EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.id = auth.uid()
    AND (
      u.role = 'owner' OR 
      (u.confirmed = true AND u.role IN ('employee', 'accountant'))
    )
  )
);

-- SELECT: Allow all confirmed company users to view
CREATE POLICY "Company users can view project-files"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'project-files' AND
  EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.id = auth.uid()
    AND (
      u.role = 'owner' OR 
      (u.confirmed = true AND u.role IN ('employee', 'accountant'))
    )
  )
);