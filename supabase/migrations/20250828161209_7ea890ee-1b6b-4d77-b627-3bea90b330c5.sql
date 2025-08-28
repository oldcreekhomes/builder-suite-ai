-- Add notes column to project_schedule_tasks for per-task notes
ALTER TABLE public.project_schedule_tasks 
ADD COLUMN IF NOT EXISTS notes text;