-- EMERGENCY DATA RECOVERY: Restore files incorrectly marked as deleted
-- This addresses the bug where folder/bulk delete operations affected files across all projects

-- First, let's see what we're dealing with
-- Count files that were deleted recently and might be recoverable
CREATE TEMP TABLE recovery_candidates AS
SELECT 
  id, 
  project_id, 
  original_filename, 
  uploaded_at,
  updated_at,
  CASE 
    WHEN updated_at > uploaded_at + INTERVAL '1 minute' THEN 'likely_user_deleted'
    ELSE 'likely_bug_deleted'  -- Deleted very soon after upload
  END as deletion_type
FROM project_files 
WHERE is_deleted = true 
  AND updated_at >= NOW() - INTERVAL '7 days'  -- Last 7 days
  AND project_id IS NOT NULL;

-- Log what we found for audit purposes
INSERT INTO company_issues (
  company_name, 
  category, 
  title, 
  description, 
  status, 
  priority, 
  created_by
) 
SELECT 
  'System Recovery' as company_name,
  'Data Recovery' as category,
  'File Recovery Operation' as title,
  format('Found %s files marked as deleted in last 7 days. %s appear to be bug-deleted (deleted within 1 minute of upload)', 
    (SELECT COUNT(*) FROM recovery_candidates),
    (SELECT COUNT(*) FROM recovery_candidates WHERE deletion_type = 'likely_bug_deleted')
  ) as description,
  'Open' as status,
  'High' as priority,
  (SELECT id FROM users WHERE role = 'owner' LIMIT 1) as created_by
WHERE EXISTS (SELECT 1 FROM recovery_candidates);

-- Recover files that were likely affected by the bug (deleted within 1 minute of upload)
UPDATE project_files 
SET 
  is_deleted = false, 
  updated_at = NOW()
WHERE id IN (
  SELECT id 
  FROM recovery_candidates 
  WHERE deletion_type = 'likely_bug_deleted'
);

-- Log the recovery action
INSERT INTO company_issues (
  company_name, 
  category, 
  title, 
  description, 
  status, 
  priority, 
  created_by
) 
SELECT 
  'System Recovery' as company_name,
  'Data Recovery' as category,
  'Files Restored' as title,
  format('Automatically restored %s files that were likely deleted due to the cross-project deletion bug', 
    (SELECT COUNT(*) FROM recovery_candidates WHERE deletion_type = 'likely_bug_deleted')
  ) as description,
  'Resolved' as status,
  'High' as priority,
  (SELECT id FROM users WHERE role = 'owner' LIMIT 1) as created_by
WHERE EXISTS (SELECT 1 FROM recovery_candidates WHERE deletion_type = 'likely_bug_deleted');

DROP TABLE recovery_candidates;