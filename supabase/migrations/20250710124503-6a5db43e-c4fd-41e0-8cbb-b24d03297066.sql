-- Create user notification preferences table
CREATE TABLE public.user_notification_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  browser_notifications_enabled BOOLEAN NOT NULL DEFAULT true,
  sound_notifications_enabled BOOLEAN NOT NULL DEFAULT true,
  toast_notifications_enabled BOOLEAN NOT NULL DEFAULT true,
  notification_sound TEXT NOT NULL DEFAULT 'chime',
  do_not_disturb_start TIME,
  do_not_disturb_end TIME,
  direct_message_notifications BOOLEAN NOT NULL DEFAULT true,
  group_message_notifications BOOLEAN NOT NULL DEFAULT true,
  toast_duration INTEGER NOT NULL DEFAULT 5,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable Row Level Security
ALTER TABLE public.user_notification_preferences ENABLE ROW LEVEL SECURITY;

-- Create policies for user notification preferences
CREATE POLICY "Users can view their own notification preferences" 
ON public.user_notification_preferences 
FOR SELECT 
USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own notification preferences" 
ON public.user_notification_preferences 
FOR INSERT 
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own notification preferences" 
ON public.user_notification_preferences 
FOR UPDATE 
USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own notification preferences" 
ON public.user_notification_preferences 
FOR DELETE 
USING (user_id = auth.uid());

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_notification_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_notification_preferences_updated_at
BEFORE UPDATE ON public.user_notification_preferences
FOR EACH ROW
EXECUTE FUNCTION public.update_notification_preferences_updated_at();