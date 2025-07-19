
-- Change predecessor column from text array to simple text string
ALTER TABLE public.project_schedule_tasks 
ALTER COLUMN predecessor TYPE text USING array_to_string(predecessor, ',');
