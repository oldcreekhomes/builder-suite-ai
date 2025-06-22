
-- Add approval status column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN approved_by_home_builder BOOLEAN DEFAULT FALSE;

-- For existing home builders, set them as approved since they own companies
UPDATE public.profiles 
SET approved_by_home_builder = TRUE 
WHERE user_type = 'home_builder';

-- Update policies to check for approval status
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Employees can view their home builder profile" ON public.profiles;
DROP POLICY IF EXISTS "Home builders can view their employees" ON public.profiles;

-- Recreate policies with approval checks
CREATE POLICY "Users can view their own profile" 
  ON public.profiles 
  FOR SELECT 
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" 
  ON public.profiles 
  FOR INSERT 
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile" 
  ON public.profiles 
  FOR UPDATE 
  USING (auth.uid() = id);

-- Allow employees to view their home builder's profile
CREATE POLICY "Employees can view their home builder profile" 
  ON public.profiles 
  FOR SELECT 
  USING (home_builder_id = auth.uid() OR id = home_builder_id);

-- Allow home builders to view and manage their employees
CREATE POLICY "Home builders can view their employees" 
  ON public.profiles 
  FOR SELECT 
  USING (
    user_type = 'home_builder' AND auth.uid() = id 
    OR 
    home_builder_id = auth.uid()
  );

-- Allow home builders to approve their employees
CREATE POLICY "Home builders can approve employees" 
  ON public.profiles 
  FOR UPDATE 
  USING (
    auth.uid() = id OR 
    (user_type = 'employee' AND home_builder_id = auth.uid())
  );

-- Create function to get pending employee approvals for home builders
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

-- Create function to approve an employee
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
