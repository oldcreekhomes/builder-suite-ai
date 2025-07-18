-- Drop all schedule-related tables and their dependencies
DROP TABLE IF EXISTS public.task_resource_assignments CASCADE;
DROP TABLE IF EXISTS public.task_dependencies CASCADE;
DROP TABLE IF EXISTS public.project_resources CASCADE;
DROP TABLE IF EXISTS public.project_schedule_tasks CASCADE;

-- Drop any related functions and triggers
DROP TRIGGER IF EXISTS update_task_dependencies_updated_at ON public.task_dependencies;
DROP TRIGGER IF EXISTS update_project_resources_updated_at ON public.project_resources;
DROP TRIGGER IF EXISTS update_schedule_tasks_updated_at ON public.project_schedule_tasks;