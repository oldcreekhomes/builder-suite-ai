-- Clean up all chat/messaging related data to start fresh
-- This will remove all messages, chat rooms, participants, and notification preferences
-- but preserve user accounts (owners/employees) and other app data

-- Delete all chat messages
DELETE FROM public.employee_chat_messages;

-- Delete all chat participants  
DELETE FROM public.employee_chat_participants;

-- Delete all chat rooms
DELETE FROM public.employee_chat_rooms;

-- Delete all notification preferences to reset to defaults
DELETE FROM public.user_notification_preferences;

-- Reset sequences if they exist (to start IDs from beginning)
-- Note: UUIDs don't use sequences, so this is just for completeness