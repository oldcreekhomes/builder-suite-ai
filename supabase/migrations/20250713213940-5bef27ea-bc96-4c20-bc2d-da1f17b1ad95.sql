-- Create a unified users table to replace owners and employees tables
CREATE TABLE public.users (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  first_name TEXT,
  last_name TEXT,
  phone_number TEXT,
  company_name TEXT, -- For home builders only
  avatar_url TEXT,
  role TEXT NOT NULL DEFAULT 'employee' CHECK (role IN ('owner', 'employee')),
  home_builder_id UUID, -- For employees, references the owner's id
  confirmed BOOLEAN NOT NULL DEFAULT FALSE, -- For employee approval
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Constraint: employees must have a home_builder_id, owners must not
  CONSTRAINT check_role_constraints CHECK (
    (role = 'owner' AND home_builder_id IS NULL) OR
    (role = 'employee' AND home_builder_id IS NOT NULL)
  )
);

-- Enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Migrate data from owners table
INSERT INTO public.users (
  id, email, first_name, last_name, phone_number, company_name, 
  avatar_url, role, confirmed, created_at, updated_at
)
SELECT 
  id, email, first_name, last_name, phone_number, company_name,
  avatar_url, 'owner' as role, TRUE as confirmed, created_at, updated_at
FROM public.owners;

-- Migrate data from employees table
INSERT INTO public.users (
  id, email, first_name, last_name, phone_number, avatar_url, 
  role, home_builder_id, confirmed, created_at, updated_at
)
SELECT 
  id, email, first_name, last_name, phone_number, avatar_url,
  'employee' as role, home_builder_id, confirmed, created_at, updated_at
FROM public.employees;

-- Create RLS policies for the new users table
CREATE POLICY "Users can view their own profile" 
  ON public.users 
  FOR SELECT 
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" 
  ON public.users 
  FOR UPDATE 
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Owners can manage their employees" 
  ON public.users 
  FOR ALL 
  USING (
    (role = 'owner' AND auth.uid() = id) OR 
    (role = 'employee' AND home_builder_id = auth.uid())
  )
  WITH CHECK (
    (role = 'owner' AND auth.uid() = id) OR 
    (role = 'employee' AND home_builder_id = auth.uid())
  );

CREATE POLICY "Employees can view company users" 
  ON public.users 
  FOR SELECT 
  USING (
    home_builder_id IN (
      SELECT home_builder_id 
      FROM public.users 
      WHERE id = auth.uid() AND role = 'employee' AND confirmed = true
    )
  );

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_users_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.update_users_updated_at();

-- Update the handle_new_user function to use the new users table
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  user_type_val text;
BEGIN
  user_type_val := COALESCE(NEW.raw_user_meta_data->>'user_type', 'owner');
  
  -- Insert all users into the new users table
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
    CASE WHEN user_type_val = 'home_builder' THEN NEW.raw_user_meta_data->>'company_name' ELSE NULL END,
    CASE WHEN user_type_val = 'home_builder' THEN 'owner' ELSE 'employee' END,
    CASE WHEN user_type_val = 'employee' THEN (NEW.raw_user_meta_data->>'home_builder_id')::uuid ELSE NULL END,
    CASE WHEN user_type_val = 'home_builder' THEN TRUE ELSE FALSE END
  );
  
  RETURN NEW;
END;
$$;

-- Update existing functions that reference the old tables
CREATE OR REPLACE FUNCTION public.get_home_builders()
RETURNS TABLE(id uuid, company_name text)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT u.id, u.company_name
  FROM public.users u
  WHERE u.role = 'owner' AND u.company_name IS NOT NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_current_user_home_builder_id()
RETURNS uuid
LANGUAGE plpgsql
STABLE SECURITY DEFINER
AS $$
DECLARE
  home_builder_id_result UUID;
  current_user_id UUID;
BEGIN
  current_user_id := auth.uid();
  
  IF current_user_id IS NULL THEN
    RETURN NULL;
  END IF;
  
  SELECT home_builder_id INTO home_builder_id_result
  FROM public.users 
  WHERE id = current_user_id 
    AND role = 'employee' 
    AND confirmed = true
  LIMIT 1;
  
  RETURN home_builder_id_result;
END;
$$;