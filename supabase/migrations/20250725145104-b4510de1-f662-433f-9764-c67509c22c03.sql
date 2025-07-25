ALTER TABLE project_schedule_tasks 
ALTER COLUMN parent_id TYPE TEXT USING parent_id::TEXT, 
DROP CONSTRAINT IF EXISTS fk_parent_task;