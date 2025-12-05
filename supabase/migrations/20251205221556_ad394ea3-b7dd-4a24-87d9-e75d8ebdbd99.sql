-- Fix all tasks that incorrectly have confirmed = false (showing pink) to confirmed = null (showing blue)
UPDATE public.project_schedule_tasks 
SET confirmed = null 
WHERE confirmed = false;