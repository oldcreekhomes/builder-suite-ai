-- Remove all foreign key constraints from chat tables that reference profiles
ALTER TABLE public.employee_chat_participants DROP CONSTRAINT IF EXISTS employee_chat_participants_user_id_fkey;
ALTER TABLE public.employee_chat_messages DROP CONSTRAINT IF EXISTS employee_chat_messages_sender_id_fkey;

-- List all constraints to make sure we got them all
SELECT 
    tc.table_name, 
    tc.constraint_name, 
    tc.constraint_type,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM information_schema.table_constraints AS tc 
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.table_schema = 'public' 
    AND tc.table_name IN ('employee_chat_participants', 'employee_chat_messages')
    AND tc.constraint_type = 'FOREIGN KEY';