-- Fix the recursive RLS policies for employee_chat_participants
-- Drop the problematic policies first
DROP POLICY IF EXISTS "Users can view participants in their chat rooms" ON public.employee_chat_participants;
DROP POLICY IF EXISTS "Users can add participants to chat rooms they're in" ON public.employee_chat_participants;

-- Create simpler, non-recursive policies
CREATE POLICY "Users can view chat participants" 
ON public.employee_chat_participants 
FOR SELECT 
USING (
  user_id = auth.uid() OR 
  EXISTS (
    SELECT 1 FROM public.employee_chat_rooms 
    WHERE id = employee_chat_participants.room_id 
    AND created_by = auth.uid()
  )
);

CREATE POLICY "Users can add chat participants" 
ON public.employee_chat_participants 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.employee_chat_rooms 
    WHERE id = employee_chat_participants.room_id 
    AND created_by = auth.uid()
  )
);