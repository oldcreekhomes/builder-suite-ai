-- Remove priority and notes columns from project_schedule_tasks table
ALTER TABLE public.project_schedule_tasks 
DROP COLUMN IF EXISTS priority,
DROP COLUMN IF EXISTS notes;