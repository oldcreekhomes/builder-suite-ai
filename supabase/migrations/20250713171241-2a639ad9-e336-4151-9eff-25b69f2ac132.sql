-- Remove direct and group message notification columns since only 1-to-1 messaging is needed
-- All message notifications will be treated the same way

ALTER TABLE public.user_notification_preferences 
DROP COLUMN IF EXISTS direct_message_notifications,
DROP COLUMN IF EXISTS group_message_notifications;