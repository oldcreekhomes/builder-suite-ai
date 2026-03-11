ALTER TABLE public.user_notification_preferences 
ADD COLUMN can_access_templates boolean NOT NULL DEFAULT false;