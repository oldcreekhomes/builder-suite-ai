-- Function to automatically sync users.role to user_roles table
CREATE OR REPLACE FUNCTION public.sync_user_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_app_role app_role;
BEGIN
  -- Map users.role (text) to app_role enum
  IF NEW.role = 'owner' THEN
    new_app_role := 'owner';
  ELSIF NEW.role = 'accountant' THEN
    new_app_role := 'accountant';
  ELSE
    -- All other roles (employee, construction_manager, project_manager, etc.) 
    -- get the 'employee' app_role (no special delete permissions)
    new_app_role := 'employee';
  END IF;

  -- Delete all existing role entries for this user
  DELETE FROM public.user_roles WHERE user_id = NEW.id;
  
  -- Insert the new role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, new_app_role);
  
  RETURN NEW;
END;
$$;

-- Create trigger on users table that fires on INSERT or UPDATE
CREATE TRIGGER sync_user_role_trigger
AFTER INSERT OR UPDATE OF role ON public.users
FOR EACH ROW
EXECUTE FUNCTION public.sync_user_role();