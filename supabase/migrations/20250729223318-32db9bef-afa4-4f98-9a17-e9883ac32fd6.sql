-- Fix search_path security issue for all database functions
-- This adds SET search_path = '' to each function for security hardening

-- 1. approve_employee
CREATE OR REPLACE FUNCTION public.approve_employee(employee_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $function$
BEGIN
  -- Check if the current user is the home builder for this employee
  IF EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = employee_id 
      AND home_builder_id = auth.uid()
      AND user_type = 'employee'
  ) THEN
    UPDATE public.users 
    SET confirmed = true,
        updated_at = NOW()
    WHERE id = employee_id;
  ELSE
    RAISE EXCEPTION 'Unauthorized: You can only approve your own employees';
  END IF;
END;
$function$;

-- 2. create_project_task
CREATE OR REPLACE FUNCTION public.create_project_task(project_id_param uuid, task_name_param text, start_date_param timestamp with time zone, end_date_param timestamp with time zone, duration_param integer DEFAULT 1, progress_param integer DEFAULT 0, predecessor_param text DEFAULT NULL::text, resources_param text DEFAULT NULL::text, parent_id_param text DEFAULT NULL::text, order_index_param integer DEFAULT 0)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $function$
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
$function$;

-- 3. delete_project_task
CREATE OR REPLACE FUNCTION public.delete_project_task(task_id_param uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $function$
BEGIN
  DELETE FROM public.project_schedule_tasks 
  WHERE id = task_id_param;
  
  RETURN FOUND;
END;
$function$;

-- 4. get_conversation_unread_count
CREATE OR REPLACE FUNCTION public.get_conversation_unread_count(other_user_id_param uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $function$
DECLARE
  unread_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO unread_count
  FROM public.user_chat_messages
  WHERE sender_id = other_user_id_param 
    AND recipient_id = auth.uid()
    AND is_deleted = false
    AND read_at IS NULL;
  
  RETURN COALESCE(unread_count, 0);
END;
$function$;

-- 5. get_current_user_company
CREATE OR REPLACE FUNCTION public.get_current_user_company()
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path = ''
AS $function$
  SELECT CASE 
    WHEN u.role = 'owner' THEN u.company_name
    WHEN u.role = 'employee' THEN (
      SELECT owner.company_name 
      FROM public.users owner 
      WHERE owner.id = u.home_builder_id
    )
    ELSE NULL
  END
  FROM public.users u 
  WHERE u.id = auth.uid();
$function$;

-- 6. get_current_user_home_builder_id
CREATE OR REPLACE FUNCTION public.get_current_user_home_builder_id()
 RETURNS uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path = ''
AS $function$
  SELECT home_builder_id 
  FROM public.users 
  WHERE id = auth.uid() 
    AND role = 'employee' 
    AND confirmed = true
  LIMIT 1;
$function$;

-- 7. get_current_user_home_builder_info
CREATE OR REPLACE FUNCTION public.get_current_user_home_builder_info()
 RETURNS TABLE(is_employee boolean, home_builder_id uuid)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path = ''
AS $function$
  SELECT 
    (role = 'employee' AND confirmed = true) as is_employee,
    home_builder_id
  FROM public.users 
  WHERE id = auth.uid()
  LIMIT 1;
$function$;

-- 8. get_home_builders
CREATE OR REPLACE FUNCTION public.get_home_builders()
 RETURNS TABLE(id uuid, company_name text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $function$
BEGIN
  RETURN QUERY
  SELECT u.id, u.company_name
  FROM public.users u
  WHERE u.role = 'owner' AND u.company_name IS NOT NULL;
END;
$function$;

-- 9. get_pending_employee_approvals
CREATE OR REPLACE FUNCTION public.get_pending_employee_approvals()
 RETURNS TABLE(id uuid, email text, company_name text, created_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    u.id,
    u.email,
    home_builder.company_name,
    u.created_at
  FROM public.users u
  JOIN public.users home_builder ON u.home_builder_id = home_builder.id
  WHERE u.user_type = 'employee' 
    AND u.confirmed = false
    AND home_builder.id = auth.uid();
END;
$function$;

-- 10. get_project_tasks
CREATE OR REPLACE FUNCTION public.get_project_tasks(project_id_param uuid)
 RETURNS TABLE(id uuid, project_id uuid, task_name text, start_date timestamp with time zone, end_date timestamp with time zone, duration integer, progress integer, predecessor text, resources text, parent_id text, order_index integer, created_at timestamp with time zone, updated_at timestamp with time zone, confirmed boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
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
    pst.confirmed
  FROM public.project_schedule_tasks pst
  WHERE pst.project_id = project_id_param
  ORDER BY pst.order_index;
END;
$function$;

-- 11. get_user_role_and_home_builder
CREATE OR REPLACE FUNCTION public.get_user_role_and_home_builder(user_id uuid)
 RETURNS TABLE(user_role text, user_home_builder_id uuid)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path = ''
AS $function$
  SELECT u.role, u.home_builder_id
  FROM public.users u
  WHERE u.id = user_id;
$function$;

-- 12. handle_new_user
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $function$
DECLARE
  user_type_val text;
  owner_company_name text;
BEGIN
  user_type_val := COALESCE(NEW.raw_user_meta_data->>'user_type', 'owner');
  
  -- If employee, get the company name from their owner
  IF user_type_val = 'employee' AND NEW.raw_user_meta_data->>'home_builder_id' IS NOT NULL THEN
    SELECT company_name INTO owner_company_name
    FROM public.users 
    WHERE id = (NEW.raw_user_meta_data->>'home_builder_id')::uuid 
      AND role = 'owner';
  END IF;
  
  -- Insert user into the users table
  INSERT INTO public.users (
    id, email, first_name, last_name, phone_number, company_name, 
    role, home_builder_id, confirmed
  )
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'first_name',
    NEW.raw_user_meta_data->>'last_name',
    NEW.raw_user_meta_data->>'phone_number',
    CASE 
      WHEN user_type_val = 'home_builder' THEN NEW.raw_user_meta_data->>'company_name'
      WHEN user_type_val = 'employee' THEN owner_company_name
      ELSE NULL 
    END,
    CASE WHEN user_type_val = 'home_builder' THEN 'owner' ELSE 'employee' END,
    CASE WHEN user_type_val = 'employee' THEN (NEW.raw_user_meta_data->>'home_builder_id')::uuid ELSE NULL END,
    CASE WHEN user_type_val = 'home_builder' THEN TRUE ELSE FALSE END
  );
  
  RETURN NEW;
END;
$function$;

-- 13. mark_conversation_as_read
CREATE OR REPLACE FUNCTION public.mark_conversation_as_read(other_user_id_param uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $function$
BEGIN
  UPDATE public.user_chat_messages 
  SET read_at = NOW() 
  WHERE sender_id = other_user_id_param 
    AND recipient_id = auth.uid()
    AND read_at IS NULL;
END;
$function$;

-- 14. mark_message_as_read
CREATE OR REPLACE FUNCTION public.mark_message_as_read(message_id_param uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $function$
BEGIN
  UPDATE public.user_chat_messages 
  SET read_at = NOW() 
  WHERE id = message_id_param 
    AND recipient_id = auth.uid()
    AND read_at IS NULL;
END;
$function$;

-- 15. update_bid_package_updated_at
CREATE OR REPLACE FUNCTION public.update_bid_package_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path = ''
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- 16. update_chat_updated_at
CREATE OR REPLACE FUNCTION public.update_chat_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path = ''
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- 17. update_cost_code_specifications_updated_at
CREATE OR REPLACE FUNCTION public.update_cost_code_specifications_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path = ''
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- 18. update_employees_updated_at
CREATE OR REPLACE FUNCTION public.update_employees_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path = ''
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- 19. update_notification_preferences_updated_at
CREATE OR REPLACE FUNCTION public.update_notification_preferences_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path = ''
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- 20. update_project_folders_updated_at
CREATE OR REPLACE FUNCTION public.update_project_folders_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path = ''
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- 21. update_project_task
CREATE OR REPLACE FUNCTION public.update_project_task(id_param uuid, task_name_param text DEFAULT NULL::text, start_date_param timestamp with time zone DEFAULT NULL::timestamp with time zone, end_date_param timestamp with time zone DEFAULT NULL::timestamp with time zone, duration_param integer DEFAULT NULL::integer, progress_param integer DEFAULT NULL::integer, predecessor_param text DEFAULT NULL::text, resources_param text DEFAULT NULL::text, parent_id_param text DEFAULT NULL::text, order_index_param integer DEFAULT NULL::integer)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $function$
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
    -- Handle parent_id explicitly to allow setting it to NULL
    parent_id = CASE 
      WHEN parent_id_param IS NOT NULL THEN parent_id_param
      WHEN parent_id_param = '' THEN NULL  -- Handle empty string as NULL
      ELSE parent_id  -- Keep existing value only if parameter was not provided at all
    END,
    order_index = COALESCE(order_index_param, order_index),
    updated_at = NOW()
  WHERE id = id_param;
  
  RETURN FOUND;
END;
$function$;

-- 22. update_project_task_by_number
CREATE OR REPLACE FUNCTION public.update_project_task_by_number(task_number_param integer, project_id_param uuid, task_name_param text DEFAULT NULL::text, start_date_param timestamp with time zone DEFAULT NULL::timestamp with time zone, end_date_param timestamp with time zone DEFAULT NULL::timestamp with time zone, duration_param integer DEFAULT NULL::integer, progress_param integer DEFAULT NULL::integer, predecessor_param text DEFAULT NULL::text, resources_param text DEFAULT NULL::text, parent_id_param text DEFAULT NULL::text, order_index_param integer DEFAULT NULL::integer)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
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
    parent_id = COALESCE(parent_id_param, parent_id),
    order_index = COALESCE(order_index_param, order_index),
    updated_at = NOW()
  WHERE task_number = task_number_param AND project_id = project_id_param;
  
  RETURN FOUND;
END;
$function$;

-- 23. update_schedule_tasks_updated_at
CREATE OR REPLACE FUNCTION public.update_schedule_tasks_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path = ''
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- 24. update_user_chat_messages_updated_at
CREATE OR REPLACE FUNCTION public.update_user_chat_messages_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path = ''
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- 25. update_users_updated_at
CREATE OR REPLACE FUNCTION public.update_users_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path = ''
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;