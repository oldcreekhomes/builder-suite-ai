
-- Permanently delete unused resource assignment tables and all related policies
-- These tables are not being used in the current system and need to be completely removed

-- First, drop all RLS policies for task_resource_assignments table
DROP POLICY IF EXISTS "Company users can access all assignment data" ON public.task_resource_assignments;

-- Then drop all RLS policies for project_resources table  
DROP POLICY IF EXISTS "Company users can access all resource data" ON public.project_resources;

-- Drop the task_resource_assignments table with CASCADE to remove all dependencies
DROP TABLE IF EXISTS public.task_resource_assignments CASCADE;

-- Drop the project_resources table with CASCADE to remove all dependencies
DROP TABLE IF EXISTS public.project_resources CASCADE;

-- Drop any related triggers that were created for these tables
DROP TRIGGER IF EXISTS update_project_resources_updated_at ON public.project_resources;
DROP TRIGGER IF EXISTS update_task_resource_assignments_updated_at ON public.task_resource_assignments;

-- Drop any related functions if they exist
DROP FUNCTION IF EXISTS update_project_resources_updated_at();
DROP FUNCTION IF EXISTS update_task_resource_assignments_updated_at();
