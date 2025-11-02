-- Migrate existing bank statements from Monthly Reports folder to Bank Statements folder
UPDATE project_files
SET 
  original_filename = REPLACE(original_filename, 'Monthly Reports/Bank Statements/', 'Bank Statements/'),
  updated_at = NOW()
WHERE 
  is_deleted = false
  AND original_filename LIKE 'Monthly Reports/Bank Statements/%'
  AND mime_type = 'application/pdf';