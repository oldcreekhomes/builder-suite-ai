-- Update the project task function to properly handle NULL parent_id values
CREATE OR REPLACE FUNCTION public.update_project_task(
  id_param uuid,
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
  -- Validate that parent_id is not the same as the task ID
  IF parent_id_param IS NOT NULL AND parent_id_param = id_param::text THEN
    RAISE EXCEPTION 'A task cannot be its own parent';
  END IF;
  
  UPDATE public.project_schedule_tasks 
  SET 
    task_name = COALESCE(task_name_param, task_name),
    start_date = COALESCE(start_date_param, start_date),
    end_date = COALESCE(end_date_param, end_date),
    duration = COALESCE(duration_param, duration),
    progress = COALESCE(progress_param, progress),
    predecessor = COALESCE(predecessor_param, predecessor),
    resources = COALESCE(resources_param, resources),
    -- Handle parent_id explicitly to allow setting it to NULL
    parent_id = CASE 
      WHEN parent_id_param IS NOT NULL THEN parent_id_param
      WHEN parent_id_param = '' THEN NULL  -- Handle empty string as NULL
      ELSE parent_id  -- Keep existing value only if parameter was not provided at all
    END,
    order_index = COALESCE(order_index_param, order_index),
    updated_at = NOW()
  WHERE id = id_param;
  
  RETURN FOUND;
END;
$function$