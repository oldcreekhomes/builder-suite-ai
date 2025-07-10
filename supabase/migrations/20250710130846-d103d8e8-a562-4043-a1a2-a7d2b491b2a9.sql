-- Add reply_to_message_id column to employee_chat_messages table
ALTER TABLE public.employee_chat_messages 
ADD COLUMN reply_to_message_id UUID REFERENCES public.employee_chat_messages(id);