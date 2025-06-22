
-- First, drop everything cleanly
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.get_home_builders() CASCADE;
DROP FUNCTION IF EXISTS public.approve_employee(uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS public.get_pending_employee_approvals(uuid) CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;
DROP TYPE IF EXISTS public.user_type CASCADE;

-- Now recreate everything from scratch
CREATE TYPE public.user_type AS ENUM ('home_builder', 'employee');

-- Create the profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  user_type public.user_type NOT NULL,
  company_name TEXT,
  home_builder_id UUID REFERENCES public.profiles(id),
  approved_by_home_builder BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Basic RLS policies
CREATE POLICY "Users can manage their own profile" ON public.profiles
  FOR ALL USING (auth.uid() = id);

-- Create the trigger function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, user_type, company_name, home_builder_id, approved_by_home_builder)
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

-- Create the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Recreate helper functions
CREATE OR REPLACE FUNCTION public.get_home_builders()
RETURNS TABLE(id UUID, company_name TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT p.id, p.company_name
  FROM public.profiles p
  WHERE p.user_type = 'home_builder' AND p.company_name IS NOT NULL;
END;
$$;
