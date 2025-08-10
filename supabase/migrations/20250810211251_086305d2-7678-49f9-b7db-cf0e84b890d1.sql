-- Remove hierarchy_number and add simple order_index for native Syncfusion drag and drop
ALTER TABLE project_schedule_tasks 
DROP COLUMN hierarchy_number,
ADD COLUMN order_index INTEGER DEFAULT 0;

-- Update existing tasks to have sequential order_index based on creation order
UPDATE project_schedule_tasks 
SET order_index = row_number() OVER (PARTITION BY project_id, parent_id ORDER BY created_at);