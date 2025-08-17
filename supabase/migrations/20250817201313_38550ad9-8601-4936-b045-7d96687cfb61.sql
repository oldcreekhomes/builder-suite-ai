-- Fix search path for specific function signatures to address security warning
ALTER FUNCTION public.create_project_task(uuid, text, timestamp with time zone, timestamp with time zone, integer, integer, text, text, text) SET search_path = '';
ALTER FUNCTION public.update_project_task(uuid, text, timestamp with time zone, timestamp with time zone, integer, integer, text, text, text, integer) SET search_path = '';
ALTER FUNCTION public.update_project_task(uuid, text, timestamp with time zone, timestamp with time zone, integer, integer, text, text, text) SET search_path = '';