-- Create function to update project task by task number (for Gantt component)
CREATE OR REPLACE FUNCTION public.update_project_task_by_number(
  task_number_param INTEGER,
  project_id_param UUID,
  task_name_param TEXT DEFAULT NULL,
  start_date_param TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  end_date_param TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  duration_param INTEGER DEFAULT NULL,
  progress_param INTEGER DEFAULT NULL,
  predecessor_param TEXT DEFAULT NULL,
  resources_param TEXT DEFAULT NULL,
  parent_task_number_param INTEGER DEFAULT NULL,
  order_index_param INTEGER DEFAULT NULL
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
    parent_task_number = COALESCE(parent_task_number_param, parent_task_number),
    order_index = COALESCE(order_index_param, order_index),
    updated_at = NOW()
  WHERE task_number = task_number_param AND project_id = project_id_param;
  
  RETURN FOUND;
END;
$function$;