ALTER TABLE public.user_notification_preferences 
ADD COLUMN IF NOT EXISTS can_access_accountant_dashboard boolean DEFAULT false;