-- Create notification preferences for existing users who don't have them
INSERT INTO public.user_notification_preferences (
  user_id,
  browser_notifications_enabled,
  sound_notifications_enabled,
  toast_notifications_enabled,
  notification_sound,
  direct_message_notifications,
  group_message_notifications,
  toast_duration
)
SELECT 
  o.id as user_id,
  true as browser_notifications_enabled,
  true as sound_notifications_enabled,
  true as toast_notifications_enabled,
  'chime' as notification_sound,
  true as direct_message_notifications,
  true as group_message_notifications,
  5 as toast_duration
FROM public.owners o
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_notification_preferences unp 
  WHERE unp.user_id = o.id
)

UNION ALL

SELECT 
  e.id as user_id,
  true as browser_notifications_enabled,
  true as sound_notifications_enabled,
  true as toast_notifications_enabled,
  'chime' as notification_sound,
  true as direct_message_notifications,
  true as group_message_notifications,
  5 as toast_duration
FROM public.employees e
WHERE e.confirmed = true
AND NOT EXISTS (
  SELECT 1 FROM public.user_notification_preferences unp 
  WHERE unp.user_id = e.id
);