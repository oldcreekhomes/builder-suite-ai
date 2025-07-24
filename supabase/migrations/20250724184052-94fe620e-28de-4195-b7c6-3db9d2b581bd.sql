-- Remove the unused parent_task_number column since we're using parent_id (UUID-based relationships)
ALTER TABLE public.project_schedule_tasks 
DROP COLUMN parent_task_number;