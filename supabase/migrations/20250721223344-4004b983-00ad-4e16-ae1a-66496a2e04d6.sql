
-- First, let's create a database function to handle Gantt task CRUD operations more efficiently
-- This will be used by our Edge Functions

CREATE OR REPLACE FUNCTION get_gantt_tasks_for_project(project_id_param uuid)
RETURNS TABLE (
  id uuid,
  project_id uuid,
  task_name text,
  start_date timestamp with time zone,
  end_date timestamp with time zone,
  duration integer,
  progress integer,
  assigned_to text,
  predecessor text,
  parent_id text,
  order_index integer,
  color text,
  created_at timestamp with time zone,
  updated_at timestamp with time zone
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT 
    t.id,
    t.project_id,
    t.task_name,
    t.start_date,
    t.end_date,
    t.duration,
    t.progress,
    t.assigned_to,
    t.predecessor,
    t.parent_id,
    t.order_index,
    t.color,
    t.created_at,
    t.updated_at
  FROM project_schedule_tasks t
  WHERE t.project_id = project_id_param
  ORDER BY t.order_index;
$$;

-- Create function to insert gantt task
CREATE OR REPLACE FUNCTION insert_gantt_task(
  project_id_param uuid,
  task_name_param text,
  start_date_param timestamp with time zone,
  end_date_param timestamp with time zone,
  duration_param integer DEFAULT 1,
  progress_param integer DEFAULT 0,
  assigned_to_param text DEFAULT NULL,
  predecessor_param text DEFAULT '',
  parent_id_param text DEFAULT NULL,
  order_index_param integer DEFAULT 0,
  color_param text DEFAULT '#3b82f6'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_task_id uuid;
BEGIN
  INSERT INTO project_schedule_tasks (
    project_id,
    task_name,
    start_date,
    end_date,
    duration,
    progress,
    assigned_to,
    predecessor,
    parent_id,
    order_index,
    color
  ) VALUES (
    project_id_param,
    task_name_param,
    start_date_param,
    end_date_param,
    duration_param,
    progress_param,
    assigned_to_param,
    predecessor_param,
    parent_id_param,
    order_index_param,
    color_param
  ) RETURNING id INTO new_task_id;
  
  RETURN new_task_id;
END;
$$;

-- Create function to update gantt task
CREATE OR REPLACE FUNCTION update_gantt_task(
  task_id_param uuid,
  task_name_param text DEFAULT NULL,
  start_date_param timestamp with time zone DEFAULT NULL,
  end_date_param timestamp with time zone DEFAULT NULL,
  duration_param integer DEFAULT NULL,
  progress_param integer DEFAULT NULL,
  assigned_to_param text DEFAULT NULL,
  predecessor_param text DEFAULT NULL,
  parent_id_param text DEFAULT NULL,
  order_index_param integer DEFAULT NULL,
  color_param text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE project_schedule_tasks SET
    task_name = COALESCE(task_name_param, task_name),
    start_date = COALESCE(start_date_param, start_date),
    end_date = COALESCE(end_date_param, end_date),
    duration = COALESCE(duration_param, duration),
    progress = COALESCE(progress_param, progress),
    assigned_to = COALESCE(assigned_to_param, assigned_to),
    predecessor = COALESCE(predecessor_param, predecessor),
    parent_id = COALESCE(parent_id_param, parent_id),
    order_index = COALESCE(order_index_param, order_index),
    color = COALESCE(color_param, color),
    updated_at = now()
  WHERE id = task_id_param;
  
  RETURN FOUND;
END;
$$;

-- Create function to delete gantt task
CREATE OR REPLACE FUNCTION delete_gantt_task(task_id_param uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM project_schedule_tasks WHERE id = task_id_param;
  RETURN FOUND;
END;
$$;
