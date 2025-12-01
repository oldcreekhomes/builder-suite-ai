-- Add browser_notifications_enabled column to user_notification_preferences
ALTER TABLE public.user_notification_preferences 
ADD COLUMN IF NOT EXISTS browser_notifications_enabled boolean NOT NULL DEFAULT false;