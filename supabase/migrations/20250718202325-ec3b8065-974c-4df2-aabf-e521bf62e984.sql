
-- Remove unused columns from project_schedule_tasks table to simplify the schema
ALTER TABLE public.project_schedule_tasks 
DROP COLUMN IF EXISTS task_type,
DROP COLUMN IF EXISTS cost_estimate,
DROP COLUMN IF EXISTS actual_cost,
DROP COLUMN IF EXISTS completion_percentage;
