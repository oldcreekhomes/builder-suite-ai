-- Fix corrupted parent_id relationships in project_schedule_tasks
-- Remove self-referencing parent_id values and fix hierarchy

UPDATE public.project_schedule_tasks 
SET parent_id = NULL 
WHERE id::text = parent_id;

-- Also clean up any parent_id references that point to non-existent tasks
UPDATE public.project_schedule_tasks 
SET parent_id = NULL 
WHERE parent_id IS NOT NULL 
  AND parent_id NOT IN (
    SELECT id::text FROM public.project_schedule_tasks
  );

-- Add validation to prevent self-referencing parent_ids in create function
CREATE OR REPLACE FUNCTION public.create_project_task(
  project_id_param uuid, 
  task_name_param text, 
  start_date_param timestamp with time zone, 
  end_date_param timestamp with time zone, 
  duration_param integer DEFAULT 1, 
  progress_param integer DEFAULT 0, 
  predecessor_param text DEFAULT NULL::text, 
  resources_param text DEFAULT NULL::text, 
  parent_id_param text DEFAULT NULL::text, 
  order_index_param integer DEFAULT 0
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_task_id UUID;
BEGIN
  -- Generate the new task ID first
  new_task_id := gen_random_uuid();
  
  -- Validate that parent_id is not the same as the new task ID
  IF parent_id_param IS NOT NULL AND parent_id_param = new_task_id::text THEN
    RAISE EXCEPTION 'A task cannot be its own parent';
  END IF;
  
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
    parent_id,
    order_index
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
    parent_id_param,
    order_index_param
  );
  
  RETURN new_task_id;
END;
$$;

-- Add validation to prevent self-referencing parent_ids in update function
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
AS $$
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
    parent_id = COALESCE(parent_id_param, parent_id),
    order_index = COALESCE(order_index_param, order_index),
    updated_at = NOW()
  WHERE id = id_param;
  
  RETURN FOUND;
END;
$$;