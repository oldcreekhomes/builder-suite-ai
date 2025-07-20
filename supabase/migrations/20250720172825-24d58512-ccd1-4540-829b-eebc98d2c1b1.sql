-- Change parent_id from UUID to text for simpler Syncfusion integration
ALTER TABLE public.project_schedule_tasks 
DROP CONSTRAINT IF EXISTS project_schedule_tasks_parent_id_fkey;

ALTER TABLE public.project_schedule_tasks 
ALTER COLUMN parent_id TYPE text USING parent_id::text;