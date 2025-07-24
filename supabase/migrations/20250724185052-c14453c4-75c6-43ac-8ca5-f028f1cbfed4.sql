-- Fix get_project_tasks function to remove parent_task_number column reference
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
   task_number integer
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
    pst.task_number
  FROM public.project_schedule_tasks pst
  WHERE pst.project_id = project_id_param
  ORDER BY pst.order_index;
END;
$function$

-- Also remove the parent_task_number-based update functions since we're using parent_id now
DROP FUNCTION IF EXISTS public.update_project_task_by_number(integer, uuid, text, timestamp with time zone, timestamp with time zone, integer, integer, text, text, integer, integer);

-- Remove the old create_project_task function that used parent_task_number
DROP FUNCTION IF EXISTS public.create_project_task(uuid, text, timestamp with time zone, timestamp with time zone, integer, integer, text, text, integer, integer);