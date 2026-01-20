-- Remove away message feature completely

-- Drop the trigger first
DROP TRIGGER IF EXISTS on_new_message_check_away ON public.user_chat_messages;

-- Drop the function
DROP FUNCTION IF EXISTS public.handle_away_auto_reply();

-- Drop the away_message_log table
DROP TABLE IF EXISTS public.away_message_log;

-- Remove columns from users table
ALTER TABLE public.users DROP COLUMN IF EXISTS is_away;
ALTER TABLE public.users DROP COLUMN IF EXISTS away_message;