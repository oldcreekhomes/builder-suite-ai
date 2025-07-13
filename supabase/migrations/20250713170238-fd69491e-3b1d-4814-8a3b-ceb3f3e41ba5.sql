-- Remove do not disturb and toast duration fields from user_notification_preferences
-- These will be simplified - no more do not disturb, and toast duration will be fixed at 5 seconds

ALTER TABLE public.user_notification_preferences 
DROP COLUMN IF EXISTS do_not_disturb_start,
DROP COLUMN IF EXISTS do_not_disturb_end,
DROP COLUMN IF EXISTS toast_duration;