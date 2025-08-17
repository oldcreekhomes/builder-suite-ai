-- Create atomic function for adding tasks above existing tasks
CREATE OR REPLACE FUNCTION public.add_task_above_atomic(
  project_id_param uuid,
  target_hierarchy_param text,
  task_name_param text,
  start_date_param timestamp with time zone,
  end_date_param timestamp with time zone,
  duration_param integer DEFAULT 1,
  progress_param integer DEFAULT 0,
  predecessor_param text DEFAULT NULL,
  resources_param text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  new_task_id uuid;
  target_level integer;
  parent_hierarchy text;
  temp_offset integer := 10000;
  next_sibling_hierarchy text;
BEGIN
  -- Generate new task ID
  new_task_id := gen_random_uuid();
  
  -- Parse target hierarchy to get level and parent
  target_level := array_length(string_to_array(target_hierarchy_param, '.'), 1);
  
  IF target_level = 1 THEN
    parent_hierarchy := NULL;
  ELSE
    parent_hierarchy := substring(target_hierarchy_param from '^(.+)\.[^.]+$');
  END IF;
  
  -- Begin transaction for atomic operations
  BEGIN
    -- Step 1: Shift all tasks at same level that are >= target to temporary range
    IF target_level = 1 THEN
      -- Top level tasks
      UPDATE public.project_schedule_tasks 
      SET hierarchy_number = (hierarchy_number::integer + temp_offset)::text,
          updated_at = NOW()
      WHERE project_id = project_id_param 
        AND hierarchy_number ~ '^[0-9]+$' 
        AND hierarchy_number::integer >= target_hierarchy_param::integer;
    ELSE
      -- Child tasks
      UPDATE public.project_schedule_tasks 
      SET hierarchy_number = parent_hierarchy || '.' || ((split_part(hierarchy_number, '.', target_level))::integer + temp_offset)::text,
          updated_at = NOW()
      WHERE project_id = project_id_param 
        AND hierarchy_number ~ ('^' || parent_hierarchy || '\.[0-9]+$')
        AND (split_part(hierarchy_number, '.', target_level))::integer >= (split_part(target_hierarchy_param, '.', target_level))::integer;
    END IF;
    
    -- Step 2: Insert new task at target hierarchy
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
      target_hierarchy_param
    );
    
    -- Step 3: Shift tasks back from temporary range to final positions
    IF target_level = 1 THEN
      -- Top level tasks
      UPDATE public.project_schedule_tasks 
      SET hierarchy_number = (hierarchy_number::integer - temp_offset + 1)::text,
          updated_at = NOW()
      WHERE project_id = project_id_param 
        AND hierarchy_number ~ '^[0-9]+$' 
        AND hierarchy_number::integer > temp_offset;
    ELSE
      -- Child tasks
      UPDATE public.project_schedule_tasks 
      SET hierarchy_number = parent_hierarchy || '.' || ((split_part(hierarchy_number, '.', target_level))::integer - temp_offset + 1)::text,
          updated_at = NOW()
      WHERE project_id = project_id_param 
        AND hierarchy_number ~ ('^' || parent_hierarchy || '\.[0-9]+(\.[0-9]+)*$')
        AND (split_part(hierarchy_number, '.', target_level))::integer > temp_offset;
    END IF;
    
  EXCEPTION WHEN OTHERS THEN
    -- Rollback will happen automatically
    RAISE;
  END;
  
  RETURN new_task_id;
END;
$function$;