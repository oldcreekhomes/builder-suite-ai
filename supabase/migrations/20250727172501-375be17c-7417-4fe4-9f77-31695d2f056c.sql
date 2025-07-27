-- Add confirmed column to project_schedule_tasks table
ALTER TABLE public.project_schedule_tasks 
ADD COLUMN confirmed boolean DEFAULT false;