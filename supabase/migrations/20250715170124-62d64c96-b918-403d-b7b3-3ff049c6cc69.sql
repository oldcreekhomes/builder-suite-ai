-- Drop the problematic storage policies
DROP POLICY IF EXISTS "Company users can view their company project files" ON storage.objects;
DROP POLICY IF EXISTS "Company users can upload their company project files" ON storage.objects;
DROP POLICY IF EXISTS "Company users can update their company project files" ON storage.objects;
DROP POLICY IF EXISTS "Company users can delete their company project files" ON storage.objects;

-- Create simple, working storage policies for company-based access
CREATE POLICY "Company users can view their company project files"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'project-files' AND (
    -- For specifications files: check if path contains the user's company name
    (name LIKE 'specifications/%' AND 
     name LIKE 'specifications/' || get_current_user_company() || '/%') OR
    -- For other project files: use existing project-based logic
    (name NOT LIKE 'specifications/%' AND
     (storage.foldername(name))[1]::uuid IN (
       SELECT p.id 
       FROM projects p 
       JOIN users project_owner ON project_owner.id = p.owner_id 
       WHERE project_owner.company_name = get_current_user_company()
     ))
  )
);

CREATE POLICY "Company users can upload their company project files"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'project-files' AND (
    -- For specifications files: check if path contains the user's company name
    (name LIKE 'specifications/%' AND 
     name LIKE 'specifications/' || get_current_user_company() || '/%') OR
    -- For other project files: use existing project-based logic
    (name NOT LIKE 'specifications/%' AND
     (storage.foldername(name))[1]::uuid IN (
       SELECT p.id 
       FROM projects p 
       JOIN users project_owner ON project_owner.id = p.owner_id 
       WHERE project_owner.company_name = get_current_user_company()
     ))
  )
);

CREATE POLICY "Company users can update their company project files"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'project-files' AND (
    -- For specifications files: check if path contains the user's company name
    (name LIKE 'specifications/%' AND 
     name LIKE 'specifications/' || get_current_user_company() || '/%') OR
    -- For other project files: use existing project-based logic
    (name NOT LIKE 'specifications/%' AND
     (storage.foldername(name))[1]::uuid IN (
       SELECT p.id 
       FROM projects p 
       JOIN users project_owner ON project_owner.id = p.owner_id 
       WHERE project_owner.company_name = get_current_user_company()
     ))
  )
);

CREATE POLICY "Company users can delete their company project files"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'project-files' AND (
    -- For specifications files: check if path contains the user's company name
    (name LIKE 'specifications/%' AND 
     name LIKE 'specifications/' || get_current_user_company() || '/%') OR
    -- For other project files: use existing project-based logic
    (name NOT LIKE 'specifications/%' AND
     (storage.foldername(name))[1]::uuid IN (
       SELECT p.id 
       FROM projects p 
       JOIN users project_owner ON project_owner.id = p.owner_id 
       WHERE project_owner.company_name = get_current_user_company()
     ))
  )
);