-- Create a new function to handle proper task reordering
CREATE OR REPLACE FUNCTION public.reorder_project_tasks(
  task_id_param uuid,
  new_order_index_param integer,
  new_parent_id_param text DEFAULT NULL,
  project_id_param uuid DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  current_project_id uuid;
BEGIN
  -- Get the project_id if not provided
  IF project_id_param IS NULL THEN
    SELECT project_id INTO current_project_id
    FROM public.project_schedule_tasks
    WHERE id = task_id_param;
  ELSE
    current_project_id := project_id_param;
  END IF;

  -- Start transaction (implicit in function)
  
  -- Step 1: Shift all tasks at or after the new position up by 1
  UPDATE public.project_schedule_tasks
  SET order_index = order_index + 1,
      updated_at = NOW()
  WHERE project_id = current_project_id
    AND order_index >= new_order_index_param
    AND id != task_id_param;
  
  -- Step 2: Update the moved task with new position and parent
  UPDATE public.project_schedule_tasks
  SET order_index = new_order_index_param,
      parent_id = CASE 
        WHEN new_parent_id_param = '' THEN NULL
        WHEN new_parent_id_param IS NULL THEN parent_id
        ELSE new_parent_id_param
      END,
      updated_at = NOW()
  WHERE id = task_id_param;
  
  RETURN FOUND;
END;
$function$