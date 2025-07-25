ALTER TABLE project_schedule_tasks 
ALTER COLUMN parent_id TYPE UUID 
USING (CASE WHEN parent_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN parent_id::UUID ELSE NULL END),
ADD CONSTRAINT fk_parent_task FOREIGN KEY (parent_id) REFERENCES project_schedule_tasks(id) ON DELETE CASCADE;