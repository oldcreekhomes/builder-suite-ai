-- Add .pdf extension to all bank statement filenames missing it
-- Excludes .folderkeeper placeholder files
UPDATE project_files
SET original_filename = original_filename || '.pdf'
WHERE original_filename LIKE 'Bank Statements/%'
  AND is_deleted = false
  AND original_filename NOT LIKE '%.pdf'
  AND original_filename NOT LIKE '%.folderkeeper';