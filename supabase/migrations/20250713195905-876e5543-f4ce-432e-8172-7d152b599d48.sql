-- First drop all RLS policies on employee chat tables
DROP POLICY IF EXISTS "Owners can view direct message rooms where they are a participa" ON public.employee_chat_rooms;
DROP POLICY IF EXISTS "Owners can view chat rooms they created" ON public.employee_chat_rooms;
DROP POLICY IF EXISTS "Owners can update chat rooms they created" ON public.employee_chat_rooms;
DROP POLICY IF EXISTS "Owners can create chat rooms" ON public.employee_chat_rooms;

DROP POLICY IF EXISTS "Owners can view participants in rooms they have access to" ON public.employee_chat_participants;
DROP POLICY IF EXISTS "Owners can update their own participant records" ON public.employee_chat_participants;
DROP POLICY IF EXISTS "Owners can add chat participants" ON public.employee_chat_participants;

DROP POLICY IF EXISTS "Owners can view messages in their chat rooms" ON public.employee_chat_messages;
DROP POLICY IF EXISTS "Owners can update their own messages" ON public.employee_chat_messages;
DROP POLICY IF EXISTS "Owners can send messages to their chat rooms" ON public.employee_chat_messages;

-- Now drop the functions
DROP FUNCTION IF EXISTS public.get_or_create_dm_room(uuid);
DROP FUNCTION IF EXISTS public.mark_room_as_read(uuid);
DROP FUNCTION IF EXISTS public.get_unread_message_count(uuid, uuid);
DROP FUNCTION IF EXISTS public.get_total_unread_count(uuid);
DROP FUNCTION IF EXISTS public.is_room_participant(uuid, uuid);

-- Finally drop the tables
DROP TABLE IF EXISTS public.employee_chat_messages CASCADE;
DROP TABLE IF EXISTS public.employee_chat_participants CASCADE;
DROP TABLE IF EXISTS public.employee_chat_rooms CASCADE;