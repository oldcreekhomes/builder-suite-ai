
-- First, let's drop and recreate everything to ensure clean state
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();
DROP FUNCTION IF EXISTS public.get_home_builders();

-- Drop all policies
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Employees can view their home builder profile" ON public.profiles;
DROP POLICY IF EXISTS "Home builders can view their employees" ON public.profiles;

-- Drop the table if it exists
DROP TABLE IF EXISTS public.profiles;

-- Drop the enum type if it exists
DROP TYPE IF EXISTS public.user_type;

-- Now recreate everything from scratch
CREATE TYPE public.user_type AS ENUM ('home_builder', 'employee');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  user_type public.user_type NOT NULL,
  company_name TEXT,
  home_builder_id UUID REFERENCES public.profiles(id),
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

-- Create the function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, user_type, company_name, home_builder_id)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'user_type', 'home_builder')::public.user_type,
    NEW.raw_user_meta_data->>'company_name',
    (NEW.raw_user_meta_data->>'home_builder_id')::uuid
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically create profile on user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create function to get all home builders (for employee selection)
CREATE OR REPLACE FUNCTION public.get_home_builders()
RETURNS TABLE(id UUID, company_name TEXT) AS $$
BEGIN
  RETURN QUERY
  SELECT p.id, p.company_name
  FROM public.profiles p
  WHERE p.user_type = 'home_builder' AND p.company_name IS NOT NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
