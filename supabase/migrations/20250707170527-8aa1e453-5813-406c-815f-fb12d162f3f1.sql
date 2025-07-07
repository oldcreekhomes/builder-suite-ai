-- Remove approved_by_home_builder from home_builders table
-- since company owners don't need to approve themselves

ALTER TABLE public.home_builders 
DROP COLUMN IF EXISTS approved_by_home_builder;

-- Update the handle_new_user function to not set this field
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only insert into home_builders table for actual home builders (company owners)
  IF COALESCE(NEW.raw_user_meta_data->>'user_type', 'home_builder') = 'home_builder' THEN
    INSERT INTO public.home_builders (id, email, user_type, company_name)
    VALUES (
      NEW.id,
      NEW.email,
      'home_builder'::public.user_type,
      NEW.raw_user_meta_data->>'company_name'
    );
  END IF;
  -- Note: Employees will be handled separately through the employees table
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();