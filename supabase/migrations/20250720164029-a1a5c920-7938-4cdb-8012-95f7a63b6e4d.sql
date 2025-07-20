
-- Update existing tasks to have proper sequential order_index values
-- This will ensure consistent ordering for drag and drop functionality
UPDATE project_schedule_tasks 
SET order_index = subquery.row_number - 1
FROM (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY project_id ORDER BY created_at) as row_number
  FROM project_schedule_tasks
) AS subquery
WHERE project_schedule_tasks.id = subquery.id;
