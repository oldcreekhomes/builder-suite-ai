
-- Clean up all project schedule related tables and data
DROP POLICY IF EXISTS "Users can view project schedule tasks for their projects" ON public.project_schedule_tasks;
DROP POLICY IF EXISTS "Users can create project schedule tasks for their projects" ON public.project_schedule_tasks;
DROP POLICY IF EXISTS "Users can update project schedule tasks for their projects" ON public.project_schedule_tasks;
DROP POLICY IF EXISTS "Users can delete project schedule tasks for their projects" ON public.project_schedule_tasks;

DROP INDEX IF EXISTS idx_project_schedule_tasks_project_id;
DROP INDEX IF EXISTS idx_project_schedule_tasks_parent_id;

DROP TABLE IF EXISTS public.project_schedule_tasks;
