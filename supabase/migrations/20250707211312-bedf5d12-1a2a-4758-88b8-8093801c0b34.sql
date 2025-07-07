-- Remove the foreign key constraint from employee_chat_rooms created_by field
-- This allows both home builders (in users table) and employees (in employees table) to create chat rooms
ALTER TABLE public.employee_chat_rooms 
DROP CONSTRAINT IF EXISTS employee_chat_rooms_created_by_fkey;