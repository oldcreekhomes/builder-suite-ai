
-- Drop the gantt task functions created in the recent migration
DROP FUNCTION IF EXISTS public.get_gantt_tasks_for_project(uuid);
DROP FUNCTION IF EXISTS public.insert_gantt_task(uuid, text, timestamp with time zone, timestamp with time zone, integer, integer, text, text, text, integer, text);
DROP FUNCTION IF EXISTS public.update_gantt_task(uuid, text, timestamp with time zone, timestamp with time zone, integer, integer, text, text, text, integer, text);
DROP FUNCTION IF EXISTS public.delete_gantt_task(uuid);
