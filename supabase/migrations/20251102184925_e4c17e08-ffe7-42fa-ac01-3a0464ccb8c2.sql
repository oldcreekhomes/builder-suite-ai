-- Migration: Complete Monthly Reports cleanup and reorganization
-- This migration moves all Monthly Reports files to their proper locations

-- Step 1: Migrate root level closing report PDFs (152 files)
UPDATE project_files
SET 
  original_filename = 'Closing Reports/' || SUBSTRING(original_filename FROM 17),
  updated_at = NOW()
WHERE 
  is_deleted = false
  AND original_filename LIKE 'Monthly Reports/%.pdf'
  AND original_filename NOT LIKE 'Monthly Reports/%/%';

-- Step 2: Migrate singular "Closing Report" folder (62 files)
UPDATE project_files
SET 
  original_filename = REPLACE(original_filename, 'Monthly Reports/Closing Report/', 'Closing Reports/'),
  updated_at = NOW()
WHERE 
  is_deleted = false
  AND original_filename LIKE 'Monthly Reports/Closing Report/%';

-- Step 3: Migrate 2024/Closing Reports subfolder (14 files)
UPDATE project_files
SET 
  original_filename = REPLACE(original_filename, 'Monthly Reports/2024/Closing Reports/', 'Closing Reports/2024/'),
  updated_at = NOW()
WHERE 
  is_deleted = false
  AND original_filename LIKE 'Monthly Reports/2024/Closing Reports/%';

-- Step 4: Migrate 2024/Bank Statements (26 files)
UPDATE project_files
SET 
  original_filename = REPLACE(original_filename, 'Monthly Reports/2024/Bank Statements/', 'Bank Statements/2024/'),
  updated_at = NOW()
WHERE 
  is_deleted = false
  AND original_filename LIKE 'Monthly Reports/2024/Bank Statements/%';

-- Step 5: Migrate 2023/Bank Statements
UPDATE project_files
SET 
  original_filename = REPLACE(original_filename, 'Monthly Reports/2023/Bank Statements/', 'Bank Statements/2023/'),
  updated_at = NOW()
WHERE 
  is_deleted = false
  AND original_filename LIKE 'Monthly Reports/2023/Bank Statements/%';

-- Step 6: Migrate 2022/Bank Statements (7 files)
UPDATE project_files
SET 
  original_filename = REPLACE(original_filename, 'Monthly Reports/2022/Bank Statements/', 'Bank Statements/2022/'),
  updated_at = NOW()
WHERE 
  is_deleted = false
  AND original_filename LIKE 'Monthly Reports/2022/Bank Statements/%';

-- Step 7: Migrate Bank Reconciliations (72 files)
UPDATE project_files
SET 
  original_filename = REPLACE(original_filename, 'Monthly Reports/Bank Reconciliations/', 'Bank Reconciliations/'),
  updated_at = NOW()
WHERE 
  is_deleted = false
  AND original_filename LIKE 'Monthly Reports/Bank Reconciliations/%';

-- Step 8: Delete all remaining Monthly Reports files (.folderkeeper and empty folders)
DELETE FROM project_files
WHERE 
  is_deleted = false
  AND original_filename LIKE 'Monthly Reports/%';