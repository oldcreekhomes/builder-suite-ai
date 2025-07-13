-- Update the handle_new_user function to set company_name for employees
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
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
$$;