-- Add can_undo_reconciliation permission to user_notification_preferences
ALTER TABLE public.user_notification_preferences 
ADD COLUMN IF NOT EXISTS can_undo_reconciliation boolean NOT NULL DEFAULT false;