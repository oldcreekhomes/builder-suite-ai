-- Add away message columns to users table
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS is_away BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS away_message TEXT;

-- Create auto-reply tracking table to prevent spam
CREATE TABLE public.away_message_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  away_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(away_user_id, sender_id)
);

-- Enable RLS on the log table
ALTER TABLE public.away_message_log ENABLE ROW LEVEL SECURITY;

-- RLS policy - users can only see their own away message logs
CREATE POLICY "Users can view their own away logs"
ON public.away_message_log
FOR SELECT
USING (away_user_id = auth.uid() OR sender_id = auth.uid());

-- Create the auto-reply trigger function
CREATE OR REPLACE FUNCTION public.handle_away_auto_reply()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  recipient_is_away BOOLEAN;
  recipient_away_message TEXT;
  last_reply_sent TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Check if recipient is away
  SELECT is_away, away_message INTO recipient_is_away, recipient_away_message
  FROM public.users WHERE id = NEW.recipient_id;

  -- If recipient is away and has a message set
  IF recipient_is_away AND recipient_away_message IS NOT NULL AND recipient_away_message != '' THEN
    -- Check if we already sent an auto-reply to this sender recently (within 24 hours)
    SELECT sent_at INTO last_reply_sent
    FROM public.away_message_log
    WHERE away_user_id = NEW.recipient_id AND sender_id = NEW.sender_id;

    -- Only send if no recent auto-reply exists
    IF last_reply_sent IS NULL OR last_reply_sent < NOW() - INTERVAL '24 hours' THEN
      -- Insert the auto-reply message
      INSERT INTO public.user_chat_messages (sender_id, recipient_id, message_text)
      VALUES (NEW.recipient_id, NEW.sender_id, '[Auto-Reply] ' || recipient_away_message);

      -- Log that we sent an auto-reply (upsert)
      INSERT INTO public.away_message_log (away_user_id, sender_id, sent_at)
      VALUES (NEW.recipient_id, NEW.sender_id, NOW())
      ON CONFLICT (away_user_id, sender_id) 
      DO UPDATE SET sent_at = NOW();
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Create the trigger
DROP TRIGGER IF EXISTS on_new_message_check_away ON public.user_chat_messages;
CREATE TRIGGER on_new_message_check_away
AFTER INSERT ON public.user_chat_messages
FOR EACH ROW
EXECUTE FUNCTION public.handle_away_auto_reply();