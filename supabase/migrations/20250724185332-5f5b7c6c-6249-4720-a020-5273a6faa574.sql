-- Drop the existing function and recreate it without parent_task_number
DROP FUNCTION IF EXISTS public.get_project_tasks(uuid);

-- Recreate the function with correct return type (without parent_task_number)
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