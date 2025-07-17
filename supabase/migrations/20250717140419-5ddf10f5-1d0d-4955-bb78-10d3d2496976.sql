-- Migration to populate project_folders table from existing folderkeeper files
INSERT INTO public.project_folders (project_id, folder_path, parent_path, folder_name, created_by, created_at)
SELECT DISTINCT
  project_id,
  REGEXP_REPLACE(original_filename, '/\.folderkeeper$', '') as folder_path,
  CASE 
    WHEN original_filename ~ '^[^/]+/\.folderkeeper$' THEN NULL  -- Root level folders
    ELSE REGEXP_REPLACE(REGEXP_REPLACE(original_filename, '/[^/]+/\.folderkeeper$', ''), '^(.*)$', '\1')
  END as parent_path,
  CASE 
    WHEN original_filename ~ '^[^/]+/\.folderkeeper$' THEN REGEXP_REPLACE(original_filename, '/\.folderkeeper$', '')
    ELSE REGEXP_REPLACE(original_filename, '^.*/([^/]+)/\.folderkeeper$', '\1')
  END as folder_name,
  uploaded_by as created_by,
  uploaded_at as created_at
FROM project_files 
WHERE file_type = 'folderkeeper' 
AND is_deleted = false
AND NOT EXISTS (
  SELECT 1 FROM project_folders pf 
  WHERE pf.project_id = project_files.project_id 
  AND pf.folder_path = REGEXP_REPLACE(project_files.original_filename, '/\.folderkeeper$', '')
)
ORDER BY uploaded_at;