-- Create function to get unread message count for a user in a specific room
CREATE OR REPLACE FUNCTION public.get_unread_message_count(room_id_param UUID, user_id_param UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  last_read_time TIMESTAMP WITH TIME ZONE;
  unread_count INTEGER;
BEGIN
  -- Get the last read timestamp for this user in this room
  SELECT last_read_at INTO last_read_time
  FROM public.employee_chat_participants
  WHERE room_id = room_id_param AND user_id = user_id_param;
  
  -- If no last_read_at found, count all messages
  IF last_read_time IS NULL THEN
    SELECT COUNT(*) INTO unread_count
    FROM public.employee_chat_messages
    WHERE room_id = room_id_param 
      AND sender_id != user_id_param
      AND is_deleted = false;
  ELSE
    -- Count messages after last read time
    SELECT COUNT(*) INTO unread_count
    FROM public.employee_chat_messages
    WHERE room_id = room_id_param 
      AND sender_id != user_id_param
      AND created_at > last_read_time
      AND is_deleted = false;
  END IF;
  
  RETURN COALESCE(unread_count, 0);
END;
$$;

-- Create function to get total unread count across all rooms for a user
CREATE OR REPLACE FUNCTION public.get_total_unread_count(user_id_param UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  total_unread INTEGER := 0;
  room_record RECORD;
BEGIN
  -- Loop through all rooms the user participates in
  FOR room_record IN 
    SELECT room_id 
    FROM public.employee_chat_participants 
    WHERE user_id = user_id_param
  LOOP
    total_unread := total_unread + get_unread_message_count(room_record.room_id, user_id_param);
  END LOOP;
  
  RETURN total_unread;
END;
$$;

-- Create function to mark room as read
CREATE OR REPLACE FUNCTION public.mark_room_as_read(room_id_param UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.employee_chat_participants
  SET last_read_at = NOW()
  WHERE room_id = room_id_param AND user_id = auth.uid();
END;
$$;

-- Enable realtime for chat tables
ALTER TABLE public.employee_chat_messages REPLICA IDENTITY FULL;
ALTER TABLE public.employee_chat_participants REPLICA IDENTITY FULL;
ALTER TABLE public.employee_chat_rooms REPLICA IDENTITY FULL;

-- Add tables to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.employee_chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.employee_chat_participants;
ALTER PUBLICATION supabase_realtime ADD TABLE public.employee_chat_rooms;