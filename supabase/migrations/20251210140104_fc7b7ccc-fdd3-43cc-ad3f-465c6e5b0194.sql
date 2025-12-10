-- Add dashboard access columns to user_notification_preferences
ALTER TABLE public.user_notification_preferences 
ADD COLUMN can_access_pm_dashboard BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE public.user_notification_preferences 
ADD COLUMN can_access_owner_dashboard BOOLEAN NOT NULL DEFAULT false;