-- Drop schedule-related tables that actually exist
DROP TABLE IF EXISTS public.task_resource_assignments CASCADE;
DROP TABLE IF EXISTS public.project_schedule_tasks CASCADE;
DROP TABLE IF EXISTS public.project_resources CASCADE;

-- Drop any related triggers
DROP TRIGGER IF EXISTS update_schedule_tasks_updated_at ON public.project_schedule_tasks;