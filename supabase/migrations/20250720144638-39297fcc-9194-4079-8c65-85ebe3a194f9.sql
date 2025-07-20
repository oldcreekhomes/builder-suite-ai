-- FORCE DELETE both unused tables that are still persisting
-- This is a comprehensive removal of project_resources and task_resource_assignments

-- First disable RLS to avoid any policy conflicts
ALTER TABLE IF EXISTS public.project_resources DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.task_resource_assignments DISABLE ROW LEVEL SECURITY;

-- Drop all policies explicitly by name to ensure they're gone
DROP POLICY IF EXISTS "Company users can access all resource data" ON public.project_resources;
DROP POLICY IF EXISTS "Company users can access all assignment data" ON public.task_resource_assignments;

-- Drop any indexes that might be preventing deletion
DROP INDEX IF EXISTS idx_project_resources_project_id;
DROP INDEX IF EXISTS idx_task_resource_assignments_task_id;
DROP INDEX IF EXISTS idx_task_resource_assignments_resource_id;

-- Drop any foreign key constraints
ALTER TABLE IF EXISTS public.project_resources DROP CONSTRAINT IF EXISTS project_resources_project_id_fkey;
ALTER TABLE IF EXISTS public.task_resource_assignments DROP CONSTRAINT IF EXISTS task_resource_assignments_task_id_fkey;
ALTER TABLE IF EXISTS public.task_resource_assignments DROP CONSTRAINT IF EXISTS task_resource_assignments_resource_id_fkey;

-- Drop all triggers
DROP TRIGGER IF EXISTS update_project_resources_updated_at ON public.project_resources;
DROP TRIGGER IF EXISTS update_task_resource_assignments_updated_at ON public.task_resource_assignments;

-- Now forcefully drop the tables with CASCADE
DROP TABLE IF EXISTS public.task_resource_assignments CASCADE;
DROP TABLE IF EXISTS public.project_resources CASCADE;

-- Drop any related functions
DROP FUNCTION IF EXISTS update_project_resources_updated_at();
DROP FUNCTION IF EXISTS update_task_resource_assignments_updated_at();

-- Ensure the tables are completely removed from the publication for realtime
ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS public.project_resources;
ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS public.task_resource_assignments;