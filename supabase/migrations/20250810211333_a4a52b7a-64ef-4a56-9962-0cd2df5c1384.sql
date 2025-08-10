-- Remove hierarchy_number and update order_index
ALTER TABLE project_schedule_tasks 
DROP COLUMN hierarchy_number;

-- Update existing tasks to have simple sequential order_index
WITH numbered_tasks AS (
  SELECT id, 
         row_number() OVER (PARTITION BY project_id, parent_id ORDER BY created_at) as new_order
  FROM project_schedule_tasks
)
UPDATE project_schedule_tasks 
SET order_index = numbered_tasks.new_order
FROM numbered_tasks
WHERE project_schedule_tasks.id = numbered_tasks.id;