-- Drop existing storage policies for project-files bucket
DROP POLICY IF EXISTS "Authenticated users can view project files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload project files" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own project files" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own project files" ON storage.objects;

-- Create company-based storage policies for project-files bucket
CREATE POLICY "Company users can view their company project files"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'project-files' AND
  CASE 
    -- For specifications files: specifications/{companyId}/{costCodeId}/{fileName}
    WHEN name LIKE 'specifications/%' THEN
      (storage.foldername(name))[2]::uuid IN (
        SELECT cc.id 
        FROM cost_codes cc 
        JOIN users cost_code_owner ON cost_code_owner.id = cc.owner_id 
        WHERE cost_code_owner.company_name = get_current_user_company()
      )
    -- For other project files: {projectId}/{fileName}
    ELSE
      (storage.foldername(name))[1]::uuid IN (
        SELECT p.id 
        FROM projects p 
        JOIN users project_owner ON project_owner.id = p.owner_id 
        WHERE project_owner.company_name = get_current_user_company()
      )
  END
);

CREATE POLICY "Company users can upload their company project files"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'project-files' AND
  CASE 
    -- For specifications files: specifications/{companyId}/{costCodeId}/{fileName}
    WHEN name LIKE 'specifications/%' THEN
      (storage.foldername(name))[2]::uuid IN (
        SELECT cc.id 
        FROM cost_codes cc 
        JOIN users cost_code_owner ON cost_code_owner.id = cc.owner_id 
        WHERE cost_code_owner.company_name = get_current_user_company()
      )
    -- For other project files: {projectId}/{fileName}
    ELSE
      (storage.foldername(name))[1]::uuid IN (
        SELECT p.id 
        FROM projects p 
        JOIN users project_owner ON project_owner.id = p.owner_id 
        WHERE project_owner.company_name = get_current_user_company()
      )
  END
);

CREATE POLICY "Company users can update their company project files"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'project-files' AND
  CASE 
    -- For specifications files: specifications/{companyId}/{costCodeId}/{fileName}
    WHEN name LIKE 'specifications/%' THEN
      (storage.foldername(name))[2]::uuid IN (
        SELECT cc.id 
        FROM cost_codes cc 
        JOIN users cost_code_owner ON cost_code_owner.id = cc.owner_id 
        WHERE cost_code_owner.company_name = get_current_user_company()
      )
    -- For other project files: {projectId}/{fileName}
    ELSE
      (storage.foldername(name))[1]::uuid IN (
        SELECT p.id 
        FROM projects p 
        JOIN users project_owner ON project_owner.id = p.owner_id 
        WHERE project_owner.company_name = get_current_user_company()
      )
  END
);

CREATE POLICY "Company users can delete their company project files"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'project-files' AND
  CASE 
    -- For specifications files: specifications/{companyId}/{costCodeId}/{fileName}
    WHEN name LIKE 'specifications/%' THEN
      (storage.foldername(name))[2]::uuid IN (
        SELECT cc.id 
        FROM cost_codes cc 
        JOIN users cost_code_owner ON cost_code_owner.id = cc.owner_id 
        WHERE cost_code_owner.company_name = get_current_user_company()
      )
    -- For other project files: {projectId}/{fileName}
    ELSE
      (storage.foldername(name))[1]::uuid IN (
        SELECT p.id 
        FROM projects p 
        JOIN users project_owner ON project_owner.id = p.owner_id 
        WHERE project_owner.company_name = get_current_user_company()
      )
  END
);