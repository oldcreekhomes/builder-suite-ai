-- Remove notification_sound column since chime will be the only option
-- All users will automatically use chime sound notifications

ALTER TABLE public.user_notification_preferences 
DROP COLUMN IF EXISTS notification_sound;