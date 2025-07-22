
-- Drop the project_schedule_tasks table and all related components
DROP TABLE IF EXISTS public.project_schedule_tasks CASCADE;

-- Drop any schedule-related triggers that might still exist
DROP TRIGGER IF EXISTS update_schedule_tasks_updated_at ON public.project_schedule_tasks;

-- Note: We're keeping the receive_schedule_notifications field in company_representatives as requested
