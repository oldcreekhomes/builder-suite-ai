-- Rename home_builders table to users
ALTER TABLE public.home_builders RENAME TO users;

-- Update all functions to reference the new table name
CREATE OR REPLACE FUNCTION public.get_current_user_home_builder_id()
RETURNS UUID AS $$
BEGIN
  -- Check if current user is an employee and return their home_builder_id
  RETURN (
    SELECT home_builder_id 
    FROM public.users 
    WHERE id = auth.uid() 
    AND user_type = 'employee' 
    AND home_builder_id IS NOT NULL
    LIMIT 1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.get_home_builders()
RETURNS TABLE(id uuid, company_name text)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT p.id, p.company_name
  FROM public.users p
  WHERE p.user_type = 'home_builder' AND p.company_name IS NOT NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_pending_employee_approvals()
RETURNS TABLE(id uuid, email text, company_name text, created_at timestamp with time zone)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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
$$;

CREATE OR REPLACE FUNCTION public.approve_employee(employee_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_type_val public.user_type;
BEGIN
  user_type_val := COALESCE(NEW.raw_user_meta_data->>'user_type', 'home_builder')::public.user_type;
  
  -- Always insert into users for auth users
  INSERT INTO public.users (id, email, user_type, company_name, first_name, last_name)
  VALUES (
    NEW.id,
    NEW.email,
    user_type_val,
    CASE 
      WHEN user_type_val = 'home_builder' 
      THEN NEW.raw_user_meta_data->>'company_name'
      ELSE NULL 
    END,
    NEW.raw_user_meta_data->>'first_name',
    NEW.raw_user_meta_data->>'last_name'
  );
  
  -- If it's an employee, also create/update the employee record
  IF user_type_val = 'employee' AND NEW.raw_user_meta_data->>'home_builder_id' IS NOT NULL THEN
    UPDATE public.users
    SET 
      home_builder_id = (NEW.raw_user_meta_data->>'home_builder_id')::uuid,
      confirmed = false -- Employees start unconfirmed
    WHERE id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$;