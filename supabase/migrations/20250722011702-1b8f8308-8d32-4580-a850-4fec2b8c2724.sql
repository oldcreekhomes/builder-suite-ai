-- Drop RLS policies on project_schedule_tasks table
DROP POLICY IF EXISTS "Company users can access all company data" ON public.project_schedule_tasks;

-- Drop the project_schedule_tasks table completely with all constraints and dependencies
DROP TABLE IF EXISTS public.project_schedule_tasks CASCADE;