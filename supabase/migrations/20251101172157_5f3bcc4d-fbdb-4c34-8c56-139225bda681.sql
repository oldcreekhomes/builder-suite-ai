-- Add employee access permission to user_notification_preferences
ALTER TABLE public.user_notification_preferences 
ADD COLUMN can_access_employees boolean NOT NULL DEFAULT false;