-- Fix corrupted parent_id relationships in project_schedule_tasks
-- Remove self-referencing parent_id values and fix hierarchy

UPDATE public.project_schedule_tasks 
SET parent_id = NULL 
WHERE id::text = parent_id;

-- Also clean up any parent_id references that point to non-existent tasks
UPDATE public.project_schedule_tasks 
SET parent_id = NULL 
WHERE parent_id IS NOT NULL 
  AND parent_id NOT IN (
    SELECT id::text FROM public.project_schedule_tasks
  );