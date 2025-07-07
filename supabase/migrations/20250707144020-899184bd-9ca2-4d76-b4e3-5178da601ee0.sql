-- Check and remove all foreign key constraints on employee_chat_participants.user_id
DO $$
DECLARE
    constraint_name text;
BEGIN
    -- Get all foreign key constraint names for user_id column
    FOR constraint_name IN 
        SELECT conname 
        FROM pg_constraint 
        WHERE conrelid = 'public.employee_chat_participants'::regclass 
        AND contype = 'f'
        AND conkey = (SELECT array_position(attnum, attnum) FROM pg_attribute WHERE attrelid = 'public.employee_chat_participants'::regclass AND attname = 'user_id')
    LOOP
        EXECUTE format('ALTER TABLE public.employee_chat_participants DROP CONSTRAINT IF EXISTS %I', constraint_name);
    END LOOP;
END $$;

-- Also check employee_chat_messages sender_id constraint and remove it if it references profiles
DO $$
DECLARE
    constraint_name text;
BEGIN
    -- Get foreign key constraint names for sender_id column that reference profiles
    FOR constraint_name IN 
        SELECT conname 
        FROM pg_constraint c
        JOIN pg_class t ON c.confrelid = t.oid
        WHERE c.conrelid = 'public.employee_chat_messages'::regclass 
        AND c.contype = 'f'
        AND t.relname = 'profiles'
        AND c.conkey = (SELECT array_position(attnum, attnum) FROM pg_attribute WHERE attrelid = 'public.employee_chat_messages'::regclass AND attname = 'sender_id')
    LOOP
        EXECUTE format('ALTER TABLE public.employee_chat_messages DROP CONSTRAINT IF EXISTS %I', constraint_name);
    END LOOP;
END $$;