-- Update the get_home_builders function to use owners table
DROP FUNCTION IF EXISTS public.get_home_builders();
CREATE OR REPLACE FUNCTION public.get_home_builders()
RETURNS TABLE(id uuid, company_name text)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT o.id, o.company_name
  FROM public.owners o
  WHERE o.company_name IS NOT NULL;
END;
$$;

-- Update the handle_new_user function to use owners table  
DROP FUNCTION IF EXISTS public.handle_new_user();
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  user_type_val text;
BEGIN
  user_type_val := COALESCE(NEW.raw_user_meta_data->>'user_type', 'home_builder');
  
  -- Only insert home builders into owners table
  IF user_type_val = 'home_builder' THEN
    INSERT INTO public.owners (id, email, company_name, first_name, last_name, phone_number)
    VALUES (
      NEW.id,
      NEW.email,
      NEW.raw_user_meta_data->>'company_name',
      NEW.raw_user_meta_data->>'first_name',
      NEW.raw_user_meta_data->>'last_name',
      NEW.raw_user_meta_data->>'phone_number'
    );
  END IF;
  
  -- Employees are handled separately through the employees table invitation process
  RETURN NEW;
END;
$$;