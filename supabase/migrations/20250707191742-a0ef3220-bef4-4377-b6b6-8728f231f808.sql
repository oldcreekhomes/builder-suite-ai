-- Sync confirmed employees who have auth accounts into home_builders table
-- Only insert employees who exist in auth.users (have actual login accounts)
INSERT INTO public.home_builders (id, email, first_name, last_name, user_type, created_at, updated_at)
SELECT 
  e.id,
  e.email,
  e.first_name,
  e.last_name,
  'employee'::public.user_type,
  e.created_at,
  e.updated_at
FROM public.employees e
INNER JOIN auth.users u ON u.id = e.id  -- Only employees who have auth accounts
WHERE e.confirmed = true
AND NOT EXISTS (
  SELECT 1 FROM public.home_builders hb WHERE hb.id = e.id
);

-- Update the signup trigger to properly handle employee creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_type_val public.user_type;
BEGIN
  user_type_val := COALESCE(NEW.raw_user_meta_data->>'user_type', 'home_builder')::public.user_type;
  
  -- Always insert into home_builders for auth users
  INSERT INTO public.home_builders (id, email, user_type, company_name, first_name, last_name)
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
    INSERT INTO public.employees (
      id, 
      email, 
      first_name, 
      last_name, 
      home_builder_id, 
      confirmed
    )
    VALUES (
      NEW.id,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
      COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
      (NEW.raw_user_meta_data->>'home_builder_id')::uuid,
      false -- Employees start unconfirmed
    )
    ON CONFLICT (id) DO UPDATE SET
      email = EXCLUDED.email,
      first_name = EXCLUDED.first_name,
      last_name = EXCLUDED.last_name,
      home_builder_id = EXCLUDED.home_builder_id;
  END IF;
  
  RETURN NEW;
END;
$$;