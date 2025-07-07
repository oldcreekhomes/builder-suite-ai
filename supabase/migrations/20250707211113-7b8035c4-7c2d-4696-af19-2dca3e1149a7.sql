-- Fix the get_or_create_dm_room function to check the correct tables
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
  
  -- Check if other_user_id exists in either users or employees table (not profiles)
  SELECT EXISTS(SELECT 1 FROM public.users WHERE id = other_user_id) OR
         EXISTS(SELECT 1 FROM public.employees WHERE id = other_user_id)
  INTO other_user_exists;
  
  IF NOT other_user_exists THEN
    RAISE EXCEPTION 'User not found in users or employees table';
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
    
    -- Add both participants (no foreign key constraint now)
    INSERT INTO public.employee_chat_participants (room_id, user_id)
    VALUES 
      (room_id, current_user_id),
      (room_id, other_user_id);
  END IF;
  
  RETURN room_id;
END;
$$;