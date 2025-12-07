-- Add can_edit_projects column to user_notification_preferences
ALTER TABLE public.user_notification_preferences
ADD COLUMN IF NOT EXISTS can_edit_projects boolean NOT NULL DEFAULT false;