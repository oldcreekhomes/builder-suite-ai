-- Remove redundant home_builder_id from home_builders table
-- since this table only contains company owners, not employees

-- First, let's clean up any data inconsistencies
-- (home builders shouldn't have a home_builder_id since they ARE the home builder)
UPDATE public.home_builders 
SET home_builder_id = NULL 
WHERE user_type = 'home_builder';

-- Now remove the column entirely since it's not needed
ALTER TABLE public.home_builders 
DROP COLUMN IF EXISTS home_builder_id;

-- Also remove the self-referencing foreign key constraint if it exists
-- (it was referencing profiles.id, now home_builders.id, but we don't need it)

-- Update the handle_new_user function to not set home_builder_id
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
    INSERT INTO public.home_builders (id, email, user_type, company_name, approved_by_home_builder)
    VALUES (
      NEW.id,
      NEW.email,
      'home_builder'::public.user_type,
      NEW.raw_user_meta_data->>'company_name',
      TRUE  -- Home builders are automatically approved
    );
  END IF;
  -- Note: Employees will be handled separately through the employees table
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();