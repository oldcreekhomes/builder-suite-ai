-- Add dashboard_type column to user_notification_preferences
ALTER TABLE public.user_notification_preferences 
ADD COLUMN IF NOT EXISTS dashboard_type text NOT NULL DEFAULT 'project_manager';

-- Add comment explaining valid values
COMMENT ON COLUMN public.user_notification_preferences.dashboard_type IS 'Dashboard type for employee: project_manager or accountant';