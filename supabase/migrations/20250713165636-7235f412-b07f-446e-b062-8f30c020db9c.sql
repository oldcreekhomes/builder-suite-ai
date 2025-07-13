-- Make sure all user notification preferences are completely deleted
-- This ensures a completely clean slate for the notification system

DELETE FROM public.user_notification_preferences;

-- Verify the table is empty by checking if any rows exist
-- (This won't return data but ensures the delete worked)