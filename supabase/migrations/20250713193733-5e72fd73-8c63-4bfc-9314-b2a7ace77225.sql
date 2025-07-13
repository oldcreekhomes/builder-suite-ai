-- Create simplified user chat messages table
CREATE TABLE public.user_chat_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id UUID NOT NULL,
  recipient_id UUID NOT NULL,
  message_text TEXT,
  file_urls TEXT[],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_deleted BOOLEAN NOT NULL DEFAULT false
);

-- Create read status tracking table
CREATE TABLE public.user_chat_read_status (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  other_user_id UUID NOT NULL,
  last_read_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, other_user_id)
);

-- Enable RLS
ALTER TABLE public.user_chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_chat_read_status ENABLE ROW LEVEL SECURITY;

-- RLS policies for messages
CREATE POLICY "Users can view their own messages" ON public.user_chat_messages
FOR SELECT USING (sender_id = auth.uid() OR recipient_id = auth.uid());

CREATE POLICY "Users can send messages" ON public.user_chat_messages
FOR INSERT WITH CHECK (sender_id = auth.uid());

CREATE POLICY "Users can update their own messages" ON public.user_chat_messages
FOR UPDATE USING (sender_id = auth.uid());

-- RLS policies for read status
CREATE POLICY "Users can manage their own read status" ON public.user_chat_read_status
FOR ALL USING (user_id = auth.uid());

-- Create updated_at trigger for messages
CREATE OR REPLACE FUNCTION public.update_user_chat_messages_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_chat_messages_updated_at
  BEFORE UPDATE ON public.user_chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_user_chat_messages_updated_at();

-- Create function to mark conversation as read
CREATE OR REPLACE FUNCTION public.mark_conversation_as_read(other_user_id_param UUID)
RETURNS VOID AS $$
BEGIN
  INSERT INTO public.user_chat_read_status (user_id, other_user_id, last_read_at)
  VALUES (auth.uid(), other_user_id_param, NOW())
  ON CONFLICT (user_id, other_user_id) 
  DO UPDATE SET last_read_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get unread message count for a conversation
CREATE OR REPLACE FUNCTION public.get_conversation_unread_count(other_user_id_param UUID)
RETURNS INTEGER AS $$
DECLARE
  last_read_time TIMESTAMP WITH TIME ZONE;
  unread_count INTEGER;
BEGIN
  -- Get the last read timestamp for this conversation
  SELECT last_read_at INTO last_read_time
  FROM public.user_chat_read_status
  WHERE user_id = auth.uid() AND other_user_id = other_user_id_param;
  
  -- Count messages after last read time (or all if never read)
  IF last_read_time IS NULL THEN
    SELECT COUNT(*) INTO unread_count
    FROM public.user_chat_messages
    WHERE sender_id = other_user_id_param 
      AND recipient_id = auth.uid()
      AND is_deleted = false;
  ELSE
    SELECT COUNT(*) INTO unread_count
    FROM public.user_chat_messages
    WHERE sender_id = other_user_id_param 
      AND recipient_id = auth.uid()
      AND created_at > last_read_time
      AND is_deleted = false;
  END IF;
  
  RETURN COALESCE(unread_count, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;