-- Clean up duplicate Monthly Reports entries
DELETE FROM project_files 
WHERE project_id = '691271e6-e46f-4745-8efb-200500e819f0' 
AND original_filename LIKE 'Monthly Reports/Monthly Reports/%';