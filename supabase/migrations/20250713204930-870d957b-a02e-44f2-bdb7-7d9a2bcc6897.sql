-- Enable real-time for user_chat_messages table
ALTER TABLE public.user_chat_messages REPLICA IDENTITY FULL;

-- Add the table to the supabase_realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_chat_messages;