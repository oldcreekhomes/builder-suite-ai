
-- Add can_delete_bills column to user_notification_preferences
ALTER TABLE public.user_notification_preferences 
ADD COLUMN IF NOT EXISTS can_delete_bills boolean NOT NULL DEFAULT false;

-- Set can_delete_bills = true for existing owner preferences
UPDATE public.user_notification_preferences unp
SET can_delete_bills = true
WHERE EXISTS (
  SELECT 1 FROM public.users u
  WHERE u.id = unp.user_id AND u.role = 'owner'
);
