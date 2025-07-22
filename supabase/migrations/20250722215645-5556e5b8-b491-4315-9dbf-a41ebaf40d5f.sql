-- Force drop and recreate the parent_id column as text
ALTER TABLE public.project_schedule_tasks DROP COLUMN parent_id;
ALTER TABLE public.project_schedule_tasks ADD COLUMN parent_id text;

-- Update the get_project_tasks function signature to match
DROP FUNCTION IF EXISTS public.get_project_tasks(uuid);
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
  parent_id TEXT,
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