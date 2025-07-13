-- Add unique constraint to employee_chat_participants to prevent duplicates
ALTER TABLE public.employee_chat_participants 
ADD CONSTRAINT employee_chat_participants_room_user_unique 
UNIQUE (room_id, user_id);