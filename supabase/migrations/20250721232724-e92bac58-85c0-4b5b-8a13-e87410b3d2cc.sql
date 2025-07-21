
-- Clean up parent_id values to be consistent numeric strings
-- First, let's fix the parent_id values for this specific project

-- Update tasks with UUID parent_id to use numeric references based on order
UPDATE project_schedule_tasks 
SET parent_id = CASE 
  -- For the task with parent_id "1479bd78-fc11-4df6-b1bf-d5176d6c1d35", set it to "1"
  WHEN parent_id = '1479bd78-fc11-4df6-b1bf-d5176d6c1d35' THEN '1'
  -- Keep existing numeric parent_id values as they are
  WHEN parent_id ~ '^[0-9]+$' THEN parent_id
  -- Set any other non-numeric parent_id to NULL
  ELSE NULL
END
WHERE project_id = 'f13eae11-ab55-4034-b70c-734fc3afe340';

-- Ensure all parent_id values are either NULL or simple numeric strings
UPDATE project_schedule_tasks 
SET parent_id = NULL 
WHERE parent_id IS NOT NULL 
  AND parent_id !~ '^[0-9]+$'
  AND project_id = 'f13eae11-ab55-4034-b70c-734fc3afe340';
