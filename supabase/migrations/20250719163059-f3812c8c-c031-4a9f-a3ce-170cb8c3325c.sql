-- Rename dependencies column to predecessor in project_schedule_tasks table
ALTER TABLE public.project_schedule_tasks 
RENAME COLUMN dependencies TO predecessor;