-- Drop the duplicate update_project_task function that uses parent_task_number_param
-- Keep only the version that uses parent_id_param (text) to match the table schema

DROP FUNCTION IF EXISTS public.update_project_task(
  id_param uuid, 
  task_name_param text, 
  start_date_param timestamp with time zone, 
  end_date_param timestamp with time zone, 
  duration_param integer, 
  progress_param integer, 
  predecessor_param text, 
  resources_param text, 
  parent_task_number_param integer, 
  order_index_param integer
);

-- Also drop the duplicate create_project_task function that uses parent_task_number_param
DROP FUNCTION IF EXISTS public.create_project_task(
  project_id_param uuid, 
  task_name_param text, 
  start_date_param timestamp with time zone, 
  end_date_param timestamp with time zone, 
  duration_param integer, 
  progress_param integer, 
  predecessor_param text, 
  resources_param text, 
  parent_task_number_param integer, 
  order_index_param integer
);

-- Drop the update_project_task_by_number function that uses parent_task_number_param
DROP FUNCTION IF EXISTS public.update_project_task_by_number(
  task_number_param integer, 
  project_id_param uuid, 
  task_name_param text, 
  start_date_param timestamp with time zone, 
  end_date_param timestamp with time zone, 
  duration_param integer, 
  progress_param integer, 
  predecessor_param text, 
  resources_param text, 
  parent_task_number_param integer, 
  order_index_param integer
);

-- Keep only the functions that use parent_id_param (text) which matches our table schema