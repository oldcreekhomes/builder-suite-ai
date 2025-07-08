-- Fix infinite recursion in employees table policies by creating a security definer function

-- Create a security definer function to get the current user's home builder ID
CREATE OR REPLACE FUNCTION public.get_current_user_home_builder_id()
RETURNS UUID AS $$
DECLARE
  home_builder_id_result UUID;
  current_user_id UUID;
BEGIN
  -- Get the current user ID
  current_user_id := auth.uid();
  
  -- If auth.uid() returns null, we can't proceed
  IF current_user_id IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Check if current user is an employee and return their home_builder_id
  SELECT home_builder_id INTO home_builder_id_result
  FROM public.employees 
  WHERE id = current_user_id 
  AND confirmed = true
  LIMIT 1;
  
  RETURN home_builder_id_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Drop the problematic policies
DROP POLICY IF EXISTS "Employees can view company employees" ON public.employees;
DROP POLICY IF EXISTS "Owners can manage their employees" ON public.employees;
DROP POLICY IF EXISTS "Employees can update own record" ON public.employees;

-- Create new non-recursive policies using the security definer function
CREATE POLICY "Owners can manage their employees" 
ON public.employees 
FOR ALL 
USING (home_builder_id = auth.uid())
WITH CHECK (home_builder_id = auth.uid());

CREATE POLICY "Employees can view their own record" 
ON public.employees 
FOR SELECT 
USING (id = auth.uid());

CREATE POLICY "Employees can view company employees" 
ON public.employees 
FOR SELECT 
USING (
  -- Allow if the requesting user's home_builder_id matches this record's home_builder_id
  home_builder_id = public.get_current_user_home_builder_id()
);

CREATE POLICY "Employees can update their own record" 
ON public.employees 
FOR UPDATE 
USING (id = auth.uid())
WITH CHECK (id = auth.uid());