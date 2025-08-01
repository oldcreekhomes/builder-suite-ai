-- Clean up orphaned parent references that prevent tasks from displaying
-- Set parent_id to NULL for tasks whose parent doesn't exist
UPDATE project_schedule_tasks 
SET parent_id = NULL 
WHERE project_id = 'f13eae11-ab55-4034-b70c-734fc3afe340' 
AND parent_id = '8d50681b-2d58-4518-8175-f7adcc5c0179';