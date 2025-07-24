-- Update update_project_task_by_number function to use parent_id instead of parent_task_number
CREATE OR REPLACE FUNCTION public.update_project_task_by_number(
  task_number_param integer, 
  project_id_param uuid, 
  task_name_param text DEFAULT NULL::text, 
  start_date_param timestamp with time zone DEFAULT NULL::timestamp with time zone, 
  end_date_param timestamp with time zone DEFAULT NULL::timestamp with time zone, 
  duration_param integer DEFAULT NULL::integer, 
  progress_param integer DEFAULT NULL::integer, 
  predecessor_param text DEFAULT NULL::text, 
  resources_param text DEFAULT NULL::text, 
  parent_id_param text DEFAULT NULL::text, 
  order_index_param integer DEFAULT NULL::integer
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
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
    parent_id = COALESCE(parent_id_param, parent_id),
    order_index = COALESCE(order_index_param, order_index),
    updated_at = NOW()
  WHERE task_number = task_number_param AND project_id = project_id_param;
  
  RETURN FOUND;
END;
$function$;