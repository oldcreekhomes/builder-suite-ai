-- Drop old employee chat functions that are no longer needed
DROP FUNCTION IF EXISTS public.get_or_create_dm_room(uuid);
DROP FUNCTION IF EXISTS public.mark_room_as_read(uuid);
DROP FUNCTION IF EXISTS public.get_unread_message_count(uuid, uuid);
DROP FUNCTION IF EXISTS public.get_total_unread_count(uuid);
DROP FUNCTION IF EXISTS public.is_room_participant(uuid, uuid);

-- Drop old employee chat tables
DROP TABLE IF EXISTS public.employee_chat_messages CASCADE;
DROP TABLE IF EXISTS public.employee_chat_participants CASCADE;
DROP TABLE IF EXISTS public.employee_chat_rooms CASCADE;