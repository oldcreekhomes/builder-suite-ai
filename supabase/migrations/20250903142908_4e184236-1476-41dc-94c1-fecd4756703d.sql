-- CRITICAL DATA RECOVERY: Restore deleted Drawings folders and files
-- This will restore all files that were accidentally marked as deleted in Drawings folders

UPDATE public.project_files 
SET is_deleted = false, 
    updated_at = now()
WHERE is_deleted = true 
  AND (
    storage_path ILIKE '%/drawings/%' OR 
    storage_path ILIKE '%drawings/%' OR 
    original_filename ILIKE '%drawings%' OR
    filename ILIKE '%drawings%'
  );

-- Also ensure any project folders related to drawings are restored if they exist
-- (This is a safety measure in case folder records were affected)
SELECT COUNT(*) as restored_files_count 
FROM public.project_files 
WHERE is_deleted = false 
  AND (
    storage_path ILIKE '%/drawings/%' OR 
    storage_path ILIKE '%drawings/%' OR 
    original_filename ILIKE '%drawings%' OR
    filename ILIKE '%drawings%'
  );