-- FINAL FORCE DELETE - Remove both tables completely
-- Disable RLS first to avoid conflicts
ALTER TABLE IF EXISTS public.project_resources DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.task_resource_assignments DISABLE ROW LEVEL SECURITY;

-- Drop all policies explicitly
DROP POLICY IF EXISTS "Company users can access all resource data" ON public.project_resources;
DROP POLICY IF EXISTS "Company users can access all assignment data" ON public.task_resource_assignments;

-- Drop triggers first
DROP TRIGGER IF EXISTS update_project_resources_updated_at ON public.project_resources;
DROP TRIGGER IF EXISTS update_task_resource_assignments_updated_at ON public.task_resource_assignments;

-- Now drop the tables with CASCADE - this should work
DROP TABLE IF EXISTS public.task_resource_assignments CASCADE;
DROP TABLE IF EXISTS public.project_resources CASCADE;

-- Drop any related functions
DROP FUNCTION IF EXISTS update_project_resources_updated_at();
DROP FUNCTION IF EXISTS update_task_resource_assignments_updated_at();