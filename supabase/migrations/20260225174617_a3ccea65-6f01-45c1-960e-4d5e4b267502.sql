ALTER TABLE public.user_notification_preferences
ADD COLUMN can_delete_price_history boolean NOT NULL DEFAULT false;