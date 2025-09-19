-- EMERGENCY DATA RECOVERY: Restore files incorrectly marked as deleted
-- This addresses the bug where folder/bulk delete operations affected files across all projects

-- Recover files that were likely affected by the bug (deleted within 1 minute of upload)
-- This indicates they were probably caught in the cross-project deletion bug
UPDATE project_files 
SET 
  is_deleted = false, 
  updated_at = NOW()
WHERE is_deleted = true 
  AND updated_at >= NOW() - INTERVAL '7 days'  -- Last 7 days
  AND updated_at <= uploaded_at + INTERVAL '1 minute'  -- Deleted very soon after upload
  AND project_id IS NOT NULL;