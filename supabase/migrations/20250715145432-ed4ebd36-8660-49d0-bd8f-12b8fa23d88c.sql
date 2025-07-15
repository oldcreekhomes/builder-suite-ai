-- Clean up duplicate files - keep only the most recent version of each file
WITH duplicates AS (
  SELECT 
    original_filename,
    MIN(id) as keep_id
  FROM project_files 
  WHERE project_id = '691271e6-e46f-4745-8efb-200500e819f0'
  GROUP BY original_filename
  HAVING COUNT(*) > 1
)
DELETE FROM project_files 
WHERE project_id = '691271e6-e46f-4745-8efb-200500e819f0'
AND id NOT IN (SELECT keep_id FROM duplicates)
AND original_filename IN (SELECT original_filename FROM duplicates);