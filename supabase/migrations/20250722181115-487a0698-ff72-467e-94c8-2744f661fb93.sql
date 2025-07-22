-- Create database functions for project tasks CRUD operations

-- Function to get project tasks
CREATE OR REPLACE FUNCTION public.get_project_tasks(project_id_param UUID)
RETURNS TABLE(
  id UUID,
  project_id UUID,
  task_name TEXT,
  start_date TIMESTAMP WITH TIME ZONE,
  end_date TIMESTAMP WITH TIME ZONE,
  duration INTEGER,
  progress INTEGER,
  predecessor TEXT,
  resources TEXT,
  parent_id UUID,
  order_index INTEGER,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pst.id,
    pst.project_id,
    pst.task_name,
    pst.start_date,
    pst.end_date,
    pst.duration,
    pst.progress,
    pst.predecessor,
    pst.resources,
    pst.parent_id,
    pst.order_index,
    pst.created_at,
    pst.updated_at
  FROM public.project_schedule_tasks pst
  WHERE pst.project_id = project_id_param
  ORDER BY pst.order_index;
END;
$$;

-- Function to create a project task
CREATE OR REPLACE FUNCTION public.create_project_task(
  project_id_param UUID,
  task_name_param TEXT,
  start_date_param TIMESTAMP WITH TIME ZONE,
  end_date_param TIMESTAMP WITH TIME ZONE,
  duration_param INTEGER DEFAULT 1,
  progress_param INTEGER DEFAULT 0,
  predecessor_param TEXT DEFAULT NULL,
  resources_param TEXT DEFAULT NULL,
  parent_id_param UUID DEFAULT NULL,
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

-- Function to update a project task
CREATE OR REPLACE FUNCTION public.update_project_task(
  id_param UUID,
  task_name_param TEXT DEFAULT NULL,
  start_date_param TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  end_date_param TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  duration_param INTEGER DEFAULT NULL,
  progress_param INTEGER DEFAULT NULL,
  predecessor_param TEXT DEFAULT NULL,
  resources_param TEXT DEFAULT NULL,
  parent_id_param UUID DEFAULT NULL,
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
    order_index = COALESCE(order_index_param, order_index)
  WHERE id = id_param;
  
  RETURN FOUND;
END;
$$;

-- Function to delete a project task
CREATE OR REPLACE FUNCTION public.delete_project_task(task_id_param UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM public.project_schedule_tasks 
  WHERE id = task_id_param;
  
  RETURN FOUND;
END;
$$;