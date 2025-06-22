
-- First, let's make sure the user_type enum exists
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_type') THEN
        CREATE TYPE user_type AS ENUM ('home_builder', 'employee');
    END IF;
END $$;

-- Recreate the profiles table with proper structure
DROP TABLE IF EXISTS public.profiles CASCADE;

CREATE TABLE public.profiles (
  id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  user_type user_type NOT NULL,
  company_name TEXT, -- For home builders, this will be their company name
  home_builder_id UUID REFERENCES public.profiles(id), -- For employees, reference to their home builder
  approved_by_home_builder BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (id)
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create policies for profiles
CREATE POLICY "Users can view their own profile" 
  ON public.profiles 
  FOR SELECT 
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" 
  ON public.profiles 
  FOR UPDATE 
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" 
  ON public.profiles 
  FOR INSERT 
  WITH CHECK (auth.uid() = id);

-- Create policy for employees to view their home builder's profile
CREATE POLICY "Employees can view their home builder profile" 
  ON public.profiles 
  FOR SELECT 
  USING (home_builder_id = auth.uid() OR id = home_builder_id);

-- Create policy for home builders to view their employees
CREATE POLICY "Home builders can view their employees" 
  ON public.profiles 
  FOR SELECT 
  USING (
    user_type = 'home_builder' AND auth.uid() = id 
    OR 
    home_builder_id = auth.uid()
  );

-- Recreate the trigger function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  user_type_value user_type;
  company_name_value TEXT;
  home_builder_id_value UUID;
BEGIN
  -- Extract user type, defaulting to 'home_builder'
  user_type_value := COALESCE(NEW.raw_user_meta_data->>'user_type', 'home_builder')::user_type;
  company_name_value := NEW.raw_user_meta_data->>'company_name';
  home_builder_id_value := CASE 
    WHEN NEW.raw_user_meta_data->>'home_builder_id' IS NOT NULL 
    THEN (NEW.raw_user_meta_data->>'home_builder_id')::uuid 
    ELSE NULL 
  END;

  INSERT INTO public.profiles (id, email, user_type, company_name, home_builder_id, approved_by_home_builder)
  VALUES (
    NEW.id,
    NEW.email,
    user_type_value,
    CASE WHEN user_type_value = 'home_builder' THEN company_name_value ELSE NULL END,
    CASE WHEN user_type_value = 'employee' THEN home_builder_id_value ELSE NULL END,
    CASE WHEN user_type_value = 'home_builder' THEN TRUE ELSE FALSE END
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop the old trigger if it exists and create a new one
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Recreate the helper functions
CREATE OR REPLACE FUNCTION public.get_home_builders()
RETURNS TABLE(id UUID, company_name TEXT) AS $$
BEGIN
  RETURN QUERY
  SELECT p.id, p.company_name
  FROM public.profiles p
  WHERE p.user_type = 'home_builder' AND p.company_name IS NOT NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.approve_employee(employee_id UUID, approver_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  is_home_builder BOOLEAN;
  employee_home_builder_id UUID;
BEGIN
  -- Check if approver is a home builder
  SELECT user_type = 'home_builder' INTO is_home_builder
  FROM public.profiles
  WHERE id = approver_id;
  
  IF NOT is_home_builder THEN
    RETURN FALSE;
  END IF;
  
  -- Check if the employee belongs to this home builder
  SELECT home_builder_id INTO employee_home_builder_id
  FROM public.profiles
  WHERE id = employee_id AND user_type = 'employee';
  
  IF employee_home_builder_id != approver_id THEN
    RETURN FALSE;
  END IF;
  
  -- Approve the employee
  UPDATE public.profiles
  SET approved_by_home_builder = TRUE
  WHERE id = employee_id;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.get_pending_employee_approvals(home_builder_user_id UUID)
RETURNS TABLE(id UUID, email TEXT, created_at TIMESTAMP WITH TIME ZONE) AS $$
BEGIN
  RETURN QUERY
  SELECT p.id, p.email, p.created_at
  FROM public.profiles p
  WHERE p.user_type = 'employee' 
    AND p.home_builder_id = home_builder_user_id 
    AND p.approved_by_home_builder = FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
