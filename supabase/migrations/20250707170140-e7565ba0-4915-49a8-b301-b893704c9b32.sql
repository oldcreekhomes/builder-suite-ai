-- Rename profiles table to home_builders for clarity

-- First, rename the table
ALTER TABLE public.profiles RENAME TO home_builders;

-- Update the trigger function to reference the new table name
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.home_builders (id, email, user_type, company_name, home_builder_id, approved_by_home_builder)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'user_type', 'home_builder')::public.user_type,
    CASE 
      WHEN COALESCE(NEW.raw_user_meta_data->>'user_type', 'home_builder') = 'home_builder' 
      THEN NEW.raw_user_meta_data->>'company_name'
      ELSE NULL 
    END,
    CASE 
      WHEN COALESCE(NEW.raw_user_meta_data->>'user_type', 'home_builder') = 'employee' 
      THEN (NEW.raw_user_meta_data->>'home_builder_id')::uuid
      ELSE NULL 
    END,
    CASE 
      WHEN COALESCE(NEW.raw_user_meta_data->>'user_type', 'home_builder') = 'home_builder' 
      THEN TRUE 
      ELSE FALSE 
    END
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Update the get_home_builders function
DROP FUNCTION IF EXISTS public.get_home_builders();
CREATE OR REPLACE FUNCTION public.get_home_builders()
RETURNS TABLE(id UUID, company_name TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT p.id, p.company_name
  FROM public.home_builders p
  WHERE p.user_type = 'home_builder' AND p.company_name IS NOT NULL;
END;
$$;

-- Update the get_pending_employee_approvals function
DROP FUNCTION IF EXISTS public.get_pending_employee_approvals();
CREATE OR REPLACE FUNCTION public.get_pending_employee_approvals()
RETURNS TABLE(id UUID, email TEXT, company_name TEXT, created_at TIMESTAMP WITH TIME ZONE)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.email,
    hb.company_name,
    p.created_at
  FROM public.home_builders p
  JOIN public.home_builders hb ON p.home_builder_id = hb.id
  WHERE p.user_type = 'employee' 
    AND p.approved_by_home_builder = false
    AND hb.id = auth.uid();
END;
$$;

-- Update the approve_employee function
DROP FUNCTION IF EXISTS public.approve_employee(UUID);
CREATE OR REPLACE FUNCTION public.approve_employee(employee_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if the current user is the home builder for this employee
  IF EXISTS (
    SELECT 1 FROM public.home_builders 
    WHERE id = employee_id 
      AND home_builder_id = auth.uid()
      AND user_type = 'employee'
  ) THEN
    UPDATE public.home_builders 
    SET approved_by_home_builder = true,
        updated_at = NOW()
    WHERE id = employee_id;
  ELSE
    RAISE EXCEPTION 'Unauthorized: You can only approve your own employees';
  END IF;
END;
$$;

-- Update foreign key references
-- Update cost_codes table foreign key
ALTER TABLE public.cost_codes DROP CONSTRAINT IF EXISTS cost_codes_owner_id_fkey;
ALTER TABLE public.cost_codes ADD CONSTRAINT cost_codes_owner_id_fkey 
  FOREIGN KEY (owner_id) REFERENCES public.home_builders(id);

-- Update employee_chat_rooms table foreign key  
ALTER TABLE public.employee_chat_rooms DROP CONSTRAINT IF EXISTS employee_chat_rooms_created_by_fkey;
ALTER TABLE public.employee_chat_rooms ADD CONSTRAINT employee_chat_rooms_created_by_fkey 
  FOREIGN KEY (created_by) REFERENCES public.home_builders(id);