
-- Fix the trigger function to handle the signup metadata correctly
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Extract user type, defaulting to 'home_builder'
  DECLARE
    user_type_value user_type := COALESCE(NEW.raw_user_meta_data->>'user_type', 'home_builder')::user_type;
    company_name_value TEXT := NEW.raw_user_meta_data->>'company_name';
    home_builder_id_value UUID := CASE 
      WHEN NEW.raw_user_meta_data->>'home_builder_id' IS NOT NULL 
      THEN (NEW.raw_user_meta_data->>'home_builder_id')::uuid 
      ELSE NULL 
    END;
  BEGIN
    INSERT INTO public.profiles (id, email, user_type, company_name, home_builder_id)
    VALUES (
      NEW.id,
      NEW.email,
      user_type_value,
      CASE WHEN user_type_value = 'home_builder' THEN company_name_value ELSE NULL END,
      CASE WHEN user_type_value = 'employee' THEN home_builder_id_value ELSE NULL END
    );
    RETURN NEW;
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
