
-- Create enum for user types
CREATE TYPE user_type AS ENUM ('home_builder', 'employee');

-- Create profiles table to store additional user information
CREATE TABLE public.profiles (
  id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  user_type user_type NOT NULL,
  company_name TEXT, -- For home builders, this will be their company name
  home_builder_id UUID REFERENCES public.profiles(id), -- For employees, reference to their home builder
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

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, user_type, company_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'user_type', 'home_builder')::user_type,
    NEW.raw_user_meta_data->>'company_name'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically create profile on user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to get all home builders (for employee selection)
CREATE OR REPLACE FUNCTION public.get_home_builders()
RETURNS TABLE(id UUID, company_name TEXT) AS $$
BEGIN
  RETURN QUERY
  SELECT p.id, p.company_name
  FROM public.profiles p
  WHERE p.user_type = 'home_builder' AND p.company_name IS NOT NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
