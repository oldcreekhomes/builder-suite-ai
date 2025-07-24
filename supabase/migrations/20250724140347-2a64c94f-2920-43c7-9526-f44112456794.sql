-- Add task_number and parent_task_number columns to project_schedule_tasks
ALTER TABLE public.project_schedule_tasks 
ADD COLUMN task_number SERIAL,
ADD COLUMN parent_task_number INTEGER;

-- Create unique constraint on project_id and task_number
ALTER TABLE public.project_schedule_tasks 
ADD CONSTRAINT unique_project_task_number UNIQUE (project_id, task_number);

-- Add foreign key constraint for parent_task_number
ALTER TABLE public.project_schedule_tasks 
ADD CONSTRAINT fk_parent_task_number 
FOREIGN KEY (project_id, parent_task_number) 
REFERENCES public.project_schedule_tasks (project_id, task_number) 
DEFERRABLE INITIALLY DEFERRED;

-- Drop existing get_project_tasks function and recreate with new columns
DROP FUNCTION IF EXISTS public.get_project_tasks(uuid);

CREATE OR REPLACE FUNCTION public.get_project_tasks(project_id_param uuid)
RETURNS TABLE(
  id uuid, 
  project_id uuid, 
  task_name text, 
  start_date timestamp with time zone, 
  end_date timestamp with time zone, 
  duration integer, 
  progress integer, 
  predecessor text, 
  resources text, 
  parent_id text, 
  order_index integer, 
  created_at timestamp with time zone, 
  updated_at timestamp with time zone,
  task_number integer,
  parent_task_number integer
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
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
    pst.updated_at,
    pst.task_number,
    pst.parent_task_number
  FROM public.project_schedule_tasks pst
  WHERE pst.project_id = project_id_param
  ORDER BY pst.order_index;
END;
$function$;

-- Update create_project_task function to use parent_task_number
CREATE OR REPLACE FUNCTION public.create_project_task(
  project_id_param uuid,
  task_name_param text,
  start_date_param timestamp with time zone,
  end_date_param timestamp with time zone,
  duration_param integer DEFAULT 1,
  progress_param integer DEFAULT 0,
  predecessor_param text DEFAULT NULL::text,
  resources_param text DEFAULT NULL::text,
  parent_task_number_param integer DEFAULT NULL::integer,
  order_index_param integer DEFAULT 0
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
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
    parent_task_number,
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
    parent_task_number_param,
    order_index_param
  ) RETURNING id INTO new_task_id;
  
  RETURN new_task_id;
END;
$function$;

-- Update update_project_task function to use parent_task_number
CREATE OR REPLACE FUNCTION public.update_project_task(
  id_param uuid,
  task_name_param text DEFAULT NULL::text,
  start_date_param timestamp with time zone DEFAULT NULL::timestamp with time zone,
  end_date_param timestamp with time zone DEFAULT NULL::timestamp with time zone,
  duration_param integer DEFAULT NULL::integer,
  progress_param integer DEFAULT NULL::integer,
  predecessor_param text DEFAULT NULL::text,
  resources_param text DEFAULT NULL::text,
  parent_task_number_param integer DEFAULT NULL::integer,
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
    parent_task_number = COALESCE(parent_task_number_param, parent_task_number),
    order_index = COALESCE(order_index_param, order_index),
    updated_at = NOW()
  WHERE id = id_param;
  
  RETURN FOUND;
END;
$function$;