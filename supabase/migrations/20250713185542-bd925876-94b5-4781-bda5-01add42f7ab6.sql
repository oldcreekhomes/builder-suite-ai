-- Update the get_or_create_dm_room function to properly handle owners as participants
CREATE OR REPLACE FUNCTION public.get_or_create_dm_room(other_user_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  room_id UUID;
  current_user_id UUID;
  other_user_exists BOOLEAN := FALSE;
BEGIN
  current_user_id := auth.uid();
  
  -- Check if other_user_id exists in either owners or employees table
  SELECT EXISTS(SELECT 1 FROM public.owners WHERE id = other_user_id) OR
         EXISTS(SELECT 1 FROM public.employees WHERE id = other_user_id)
  INTO other_user_exists;
  
  IF NOT other_user_exists THEN
    RAISE EXCEPTION 'User not found in owners or employees table';
  END IF;
  
  -- Check if a direct message room already exists between these users
  SELECT er.id INTO room_id
  FROM public.employee_chat_rooms er
  WHERE er.is_direct_message = true
    AND EXISTS (
      SELECT 1 FROM public.employee_chat_participants ep1
      WHERE ep1.room_id = er.id AND ep1.user_id = current_user_id
    )
    AND EXISTS (
      SELECT 1 FROM public.employee_chat_participants ep2
      WHERE ep2.room_id = er.id AND ep2.user_id = other_user_id
    )
    AND (
      SELECT COUNT(*) FROM public.employee_chat_participants ep3
      WHERE ep3.room_id = er.id
    ) = 2;
  
  -- If no room exists, create one
  IF room_id IS NULL THEN
    INSERT INTO public.employee_chat_rooms (is_direct_message, created_by)
    VALUES (true, current_user_id)
    RETURNING id INTO room_id;
    
    -- Add both participants (this ensures BOTH owners and employees are added as participants)
    INSERT INTO public.employee_chat_participants (room_id, user_id)
    VALUES 
      (room_id, current_user_id),
      (room_id, other_user_id);
  END IF;
  
  RETURN room_id;
END;
$$;

-- Create helper function to get unread count that works for both owners and employees
CREATE OR REPLACE FUNCTION public.get_unread_message_count(room_id_param uuid, user_id_param uuid)
RETURNS integer
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

-- Update the mark_room_as_read function to work with both owners and employees
CREATE OR REPLACE FUNCTION public.mark_room_as_read(room_id_param uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Insert or update the participant record with the current timestamp
  INSERT INTO public.employee_chat_participants (room_id, user_id, last_read_at)
  VALUES (room_id_param, auth.uid(), NOW())
  ON CONFLICT (room_id, user_id) 
  DO UPDATE SET last_read_at = NOW();
END;
$$;