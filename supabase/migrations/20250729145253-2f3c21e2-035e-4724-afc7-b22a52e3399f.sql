-- Change the default value of confirmed column from false to null
-- This ensures new tasks are pending (blue) instead of denied (red)
ALTER TABLE public.project_schedule_tasks 
ALTER COLUMN confirmed SET DEFAULT null;

-- Optional: Update existing tasks that are false to null if they should be pending
-- Uncomment the line below if you want to reset existing false values to pending
-- UPDATE public.project_schedule_tasks SET confirmed = null WHERE confirmed = false;