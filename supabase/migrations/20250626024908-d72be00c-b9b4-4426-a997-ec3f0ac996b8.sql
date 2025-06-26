
-- Drop the project_schedule_tasks table and its policies
DROP POLICY IF EXISTS "Users can view project schedule tasks for their projects" ON public.project_schedule_tasks;
DROP POLICY IF EXISTS "Users can create project schedule tasks for their projects" ON public.project_schedule_tasks;
DROP POLICY IF EXISTS "Users can update project schedule tasks for their projects" ON public.project_schedule_tasks;
DROP POLICY IF EXISTS "Users can delete project schedule tasks for their projects" ON public.project_schedule_tasks;
DROP TABLE IF EXISTS public.project_schedule_tasks;

-- Drop the project_schedule table and its policies
DROP POLICY IF EXISTS "Users can view project schedules for their projects" ON public.project_schedule;
DROP POLICY IF EXISTS "Users can create project schedules for their projects" ON public.project_schedule;
DROP POLICY IF EXISTS "Users can update project schedules for their projects" ON public.project_schedule;
DROP POLICY IF EXISTS "Users can delete project schedules for their projects" ON public.project_schedule;
DROP TABLE IF EXISTS public.project_schedule;
