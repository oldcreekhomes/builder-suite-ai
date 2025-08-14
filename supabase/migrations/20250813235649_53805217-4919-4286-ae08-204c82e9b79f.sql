-- Update predecessor field to support JSON array for multiple predecessors
ALTER TABLE public.project_schedule_tasks 
ALTER COLUMN predecessor TYPE jsonb USING predecessor::jsonb;