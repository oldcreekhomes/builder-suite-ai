-- Clean up duplicate files - keep only one version of each file based on created timestamp
WITH duplicates AS (
  SELECT 
    original_filename,
    ROW_NUMBER() OVER (PARTITION BY original_filename ORDER BY uploaded_at ASC) as rn,
    id
  FROM project_files 
  WHERE project_id = '691271e6-e46f-4745-8efb-200500e819f0'
)
DELETE FROM project_files 
WHERE id IN (
  SELECT id FROM duplicates WHERE rn > 1
);