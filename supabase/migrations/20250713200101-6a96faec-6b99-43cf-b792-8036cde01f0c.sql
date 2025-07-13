-- Drop the user_chat_read_status table and its functions
DROP FUNCTION IF EXISTS public.mark_conversation_as_read(uuid);
DROP FUNCTION IF EXISTS public.get_conversation_unread_count(uuid);
DROP TABLE IF EXISTS public.user_chat_read_status CASCADE;

-- Add read_at column to user_chat_messages
ALTER TABLE public.user_chat_messages 
ADD COLUMN read_at TIMESTAMP WITH TIME ZONE NULL;

-- Create simpler function to mark a message as read
CREATE OR REPLACE FUNCTION public.mark_message_as_read(message_id_param UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE public.user_chat_messages 
  SET read_at = NOW() 
  WHERE id = message_id_param 
    AND recipient_id = auth.uid()
    AND read_at IS NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to mark all messages in a conversation as read
CREATE OR REPLACE FUNCTION public.mark_conversation_as_read(other_user_id_param UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE public.user_chat_messages 
  SET read_at = NOW() 
  WHERE sender_id = other_user_id_param 
    AND recipient_id = auth.uid()
    AND read_at IS NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get unread message count for a conversation
CREATE OR REPLACE FUNCTION public.get_conversation_unread_count(other_user_id_param UUID)
RETURNS INTEGER AS $$
DECLARE
  unread_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO unread_count
  FROM public.user_chat_messages
  WHERE sender_id = other_user_id_param 
    AND recipient_id = auth.uid()
    AND is_deleted = false
    AND read_at IS NULL;
  
  RETURN COALESCE(unread_count, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;