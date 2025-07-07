-- Fix infinite recursion in employee chat RLS policies

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Users can view chat rooms they participate in" ON public.employee_chat_rooms;
DROP POLICY IF EXISTS "Users can view chat participants" ON public.employee_chat_participants;

-- Create new non-recursive policies for employee_chat_rooms
CREATE POLICY "Users can view chat rooms they created" 
ON public.employee_chat_rooms 
FOR SELECT 
USING (created_by = auth.uid());

CREATE POLICY "Users can view direct message rooms where they are a participant" 
ON public.employee_chat_rooms 
FOR SELECT 
USING (
  is_direct_message = true 
  AND id IN (
    SELECT room_id 
    FROM public.employee_chat_participants 
    WHERE user_id = auth.uid()
  )
);

-- Update employee_chat_participants policies to be simpler
CREATE POLICY "Users can view participants in rooms they have access to" 
ON public.employee_chat_participants 
FOR SELECT 
USING (
  -- User can see participants if they are in the room
  user_id = auth.uid() 
  OR 
  -- Or if they created the room
  room_id IN (
    SELECT id 
    FROM public.employee_chat_rooms 
    WHERE created_by = auth.uid()
  )
);