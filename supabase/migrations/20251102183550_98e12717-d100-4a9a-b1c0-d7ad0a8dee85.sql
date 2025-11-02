-- Migrate existing closing reports from Monthly Reports folder to Closing Reports folder
UPDATE project_files
SET 
  original_filename = REPLACE(original_filename, 'Monthly Reports/Closing Reports/', 'Closing Reports/'),
  updated_at = NOW()
WHERE 
  is_deleted = false
  AND original_filename LIKE 'Monthly Reports/Closing Reports/%'
  AND mime_type = 'application/pdf';