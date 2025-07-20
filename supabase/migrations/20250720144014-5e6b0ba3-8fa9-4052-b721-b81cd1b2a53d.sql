
-- Drop the project_resources table that is not being used in the current system
-- This table was intended for a more complex resource management system but is redundant
-- since we're using assigned_to text field with comma-separated UUIDs directly

-- Drop the project_resources table and any associated triggers
DROP TABLE IF EXISTS public.project_resources CASCADE;

-- Drop any related triggers that were created for this table
DROP TRIGGER IF EXISTS update_project_resources_updated_at ON public.project_resources;
