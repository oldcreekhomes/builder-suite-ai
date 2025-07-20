
-- Drop the task_dependencies table and its related triggers
-- This table is redundant since we're using the predecessor field in project_schedule_tasks
-- which works directly with Syncfusion's native dependency format

-- Drop the trigger first
DROP TRIGGER IF EXISTS update_task_dependencies_updated_at ON public.task_dependencies;

-- Drop the table with CASCADE to handle any remaining foreign key references
DROP TABLE IF EXISTS public.task_dependencies CASCADE;
