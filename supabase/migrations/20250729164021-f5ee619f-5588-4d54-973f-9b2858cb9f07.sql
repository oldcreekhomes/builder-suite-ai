-- Drop existing storage policies that use get_current_user_company()
DROP POLICY IF EXISTS "Company users can access all company data" ON storage.objects;

-- Create new storage policies that directly check user access
-- Policy for viewing files
CREATE POLICY "Owners and employees can view project files" 
ON storage.objects FOR SELECT 
USING (
  bucket_id = 'project-files' AND
  EXISTS (
    SELECT 1 FROM users u
    JOIN projects p ON (
      (u.role = 'owner' AND p.owner_id = u.id) OR
      (u.role = 'employee' AND u.confirmed = true AND p.owner_id = u.home_builder_id)
    )
    WHERE u.id = auth.uid()
  )
);

-- Policy for uploading files
CREATE POLICY "Owners and employees can upload project files" 
ON storage.objects FOR INSERT 
WITH CHECK (
  bucket_id = 'project-files' AND
  EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = auth.uid() 
    AND (u.role = 'owner' OR (u.role = 'employee' AND u.confirmed = true))
  )
);

-- Policy for updating files
CREATE POLICY "Owners and employees can update project files" 
ON storage.objects FOR UPDATE 
USING (
  bucket_id = 'project-files' AND
  EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = auth.uid() 
    AND (u.role = 'owner' OR (u.role = 'employee' AND u.confirmed = true))
  )
);

-- Policy for deleting files
CREATE POLICY "Owners and employees can delete project files" 
ON storage.objects FOR DELETE 
USING (
  bucket_id = 'project-files' AND
  EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = auth.uid() 
    AND (u.role = 'owner' OR (u.role = 'employee' AND u.confirmed = true))
  )
);