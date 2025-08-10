-- Just remove hierarchy_number since order_index already exists
ALTER TABLE project_schedule_tasks 
DROP COLUMN hierarchy_number;

-- Update existing tasks to have sequential order_index based on creation order
UPDATE project_schedule_tasks 
SET order_index = row_number() OVER (PARTITION BY project_id, parent_id ORDER BY created_at);