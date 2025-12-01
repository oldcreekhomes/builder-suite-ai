-- Drop unused notification preference columns
ALTER TABLE user_notification_preferences 
DROP COLUMN IF EXISTS sound_notifications_enabled,
DROP COLUMN IF EXISTS toast_notifications_enabled;