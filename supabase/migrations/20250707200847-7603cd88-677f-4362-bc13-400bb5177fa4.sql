-- Clean up the users table to only contain relevant fields for home builders
-- Remove unnecessary columns that only made sense when employees were mixed in

-- Remove confirmed column (home builders don't need approval)
ALTER TABLE public.users DROP COLUMN IF EXISTS confirmed;

-- Remove home_builder_id column (home builders don't report to themselves)
ALTER TABLE public.users DROP COLUMN IF EXISTS home_builder_id;

-- Remove user_type column (this table only contains home builders now)
ALTER TABLE public.users DROP COLUMN IF EXISTS user_type;

-- Update the handle_new_user function to reflect the cleaner structure
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_type_val text;
BEGIN
  user_type_val := COALESCE(NEW.raw_user_meta_data->>'user_type', 'home_builder');
  
  -- Only insert home builders into users table
  IF user_type_val = 'home_builder' THEN
    INSERT INTO public.users (id, email, company_name, first_name, last_name, phone_number)
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