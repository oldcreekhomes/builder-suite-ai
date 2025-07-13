-- Remove browser notifications column from user preferences
ALTER TABLE public.user_notification_preferences 
DROP COLUMN IF EXISTS browser_notifications_enabled;