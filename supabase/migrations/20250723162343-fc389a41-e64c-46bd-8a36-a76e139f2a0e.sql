-- Fix RPC function signatures to use TEXT for parent_id instead of UUID
-- This resolves the COALESCE type mismatch errors preventing saves

-- Update create_project_task function to use TEXT for parent_id
CREATE OR REPLACE FUNCTION public.create_project_task(
  project_id_param UUID,
  task_name_param TEXT,
  start_date_param TIMESTAMP WITH TIME ZONE,
  end_date_param TIMESTAMP WITH TIME ZONE,
  duration_param INTEGER DEFAULT 1,
  progress_param INTEGER DEFAULT 0,
  predecessor_param TEXT DEFAULT NULL,
  resources_param TEXT DEFAULT NULL,
  parent_id_param TEXT DEFAULT NULL,  -- Changed from UUID to TEXT
  order_index_param INTEGER DEFAULT 0
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_task_id UUID;
BEGIN
  INSERT INTO public.project_schedule_tasks (
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
  ) RETURNING id INTO new_task_id;
  
  RETURN new_task_id;
END;
$$;

-- Update update_project_task function to use TEXT for parent_id
CREATE OR REPLACE FUNCTION public.update_project_task(
  id_param UUID,
  task_name_param TEXT DEFAULT NULL,
  start_date_param TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  end_date_param TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  duration_param INTEGER DEFAULT NULL,
  progress_param INTEGER DEFAULT NULL,
  predecessor_param TEXT DEFAULT NULL,
  resources_param TEXT DEFAULT NULL,
  parent_id_param TEXT DEFAULT NULL,  -- Changed from UUID to TEXT
  order_index_param INTEGER DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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
  WHERE id = id_param;
  
  RETURN FOUND;
END;
$$;