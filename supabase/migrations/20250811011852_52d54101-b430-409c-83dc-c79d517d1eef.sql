-- Remove parent_id column from project_schedule_tasks table
ALTER TABLE public.project_schedule_tasks DROP COLUMN IF EXISTS parent_id;

-- Update the database functions to remove parent_id references
CREATE OR REPLACE FUNCTION public.create_project_task(
  project_id_param uuid, 
  task_name_param text, 
  start_date_param timestamp with time zone, 
  end_date_param timestamp with time zone, 
  duration_param integer DEFAULT 1, 
  progress_param integer DEFAULT 0, 
  predecessor_param text DEFAULT NULL::text, 
  resources_param text DEFAULT NULL::text, 
  hierarchy_number_param text DEFAULT NULL::text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  new_task_id UUID;
BEGIN
  -- Generate the new task ID first
  new_task_id := gen_random_uuid();
  
  INSERT INTO public.project_schedule_tasks (
    id,
    project_id,
    task_name,
    start_date,
    end_date,
    duration,
    progress,
    predecessor,
    resources,
    hierarchy_number
  ) VALUES (
    new_task_id,
    project_id_param,
    task_name_param,
    start_date_param,
    end_date_param,
    duration_param,
    progress_param,
    predecessor_param,
    resources_param,
    hierarchy_number_param
  );
  
  RETURN new_task_id;
END;
$function$;

-- Update the update function to remove parent_id
CREATE OR REPLACE FUNCTION public.update_project_task(
  id_param uuid, 
  task_name_param text DEFAULT NULL::text, 
  start_date_param timestamp with time zone DEFAULT NULL::timestamp with time zone, 
  end_date_param timestamp with time zone DEFAULT NULL::timestamp with time zone, 
  duration_param integer DEFAULT NULL::integer, 
  progress_param integer DEFAULT NULL::integer, 
  predecessor_param text DEFAULT NULL::text, 
  resources_param text DEFAULT NULL::text, 
  hierarchy_number_param text DEFAULT '__UNSET__'::text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
  UPDATE public.project_schedule_tasks 
  SET 
    task_name = COALESCE(task_name_param, task_name),
    start_date = COALESCE(start_date_param, start_date),
    end_date = COALESCE(end_date_param, end_date),
    duration = COALESCE(duration_param, duration),
    progress = COALESCE(progress_param, progress),
    predecessor = COALESCE(predecessor_param, predecessor),
    resources = COALESCE(resources_param, resources),
    hierarchy_number = CASE 
      WHEN hierarchy_number_param = '__UNSET__' THEN hierarchy_number
      ELSE hierarchy_number_param
    END,
    updated_at = NOW()
  WHERE id = id_param;
  
  RETURN FOUND;
END;
$function$;