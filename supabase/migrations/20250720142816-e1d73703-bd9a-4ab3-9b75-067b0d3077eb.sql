
-- Drop unused tables that are not being used in the current resource assignment system
-- These tables were intended for a more complex resource management system but are redundant
-- since we're using assigned_to text field with comma-separated UUIDs directly

-- Drop the task_resource_assignments table
DROP TABLE IF EXISTS public.task_resource_assignments CASCADE;

-- Drop the project_resources table  
DROP TABLE IF EXISTS public.project_resources CASCADE;

-- Drop any related triggers that were created for these tables
DROP TRIGGER IF EXISTS update_project_resources_updated_at ON public.project_resources;
