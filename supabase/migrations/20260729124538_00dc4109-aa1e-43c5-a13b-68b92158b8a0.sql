ALTER TABLE public.user_notification_preferences
ADD COLUMN IF NOT EXISTS can_edit_bills boolean NOT NULL DEFAULT false;