-- Fix update_project_task to correctly handle clearing parent_id and distinguish unchanged
CREATE OR REPLACE FUNCTION public.update_project_task(
  id_param uuid,
  task_name_param text DEFAULT NULL,
  start_date_param timestamp with time zone DEFAULT NULL,
  end_date_param timestamp with time zone DEFAULT NULL,
  duration_param integer DEFAULT NULL,
  progress_param integer DEFAULT NULL,
  predecessor_param text DEFAULT NULL,
  resources_param text DEFAULT NULL,
  parent_id_param text DEFAULT '__UNSET__',
  order_index_param integer DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
  -- Validate that parent_id is not the same as the task ID when explicitly changing parent
  IF parent_id_param IS NOT NULL AND parent_id_param <> '__UNSET__' AND parent_id_param <> '' AND parent_id_param = id_param::text THEN
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
    -- Handle parent_id updates explicitly:
    --  - '__UNSET__'  => do not change
    --  - '' (empty)   => set to NULL
    --  - NULL         => set to NULL (explicit clear)
    --  - any string   => set to that parent id
    parent_id = CASE 
      WHEN parent_id_param = '__UNSET__' THEN parent_id
      WHEN parent_id_param = '' THEN NULL
      WHEN parent_id_param IS NULL THEN NULL
      ELSE parent_id_param
    END,
    order_index = COALESCE(order_index_param, order_index),
    updated_at = NOW()
  WHERE id = id_param;
  
  RETURN FOUND;
END;
$function$;