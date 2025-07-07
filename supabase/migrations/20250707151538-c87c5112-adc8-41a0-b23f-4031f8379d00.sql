-- Create security definer function to check if user is participant in a room
CREATE OR REPLACE FUNCTION public.is_room_participant(_room_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.employee_chat_participants
    WHERE room_id = _room_id
      AND user_id = _user_id
  )
$$;

-- Drop the problematic policy and recreate with security definer function
DROP POLICY IF EXISTS "Users can view direct message rooms where they are a participant" ON public.employee_chat_rooms;

-- Create new policy using the security definer function
CREATE POLICY "Users can view direct message rooms where they are a participant" 
ON public.employee_chat_rooms 
FOR SELECT 
USING (
  is_direct_message = true 
  AND public.is_room_participant(id, auth.uid())
);