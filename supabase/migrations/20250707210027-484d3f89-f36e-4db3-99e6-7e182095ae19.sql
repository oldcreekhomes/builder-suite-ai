-- Update the RLS policy on users table to allow employees to view their home builder
DROP POLICY IF EXISTS "Users can manage their own profile" ON public.users;

-- Create a new policy that allows users to see their own profile AND employees to see their home builder
CREATE POLICY "Users can view their own profile and employees can view their home builder" 
ON public.users 
FOR SELECT 
USING (
  auth.uid() = id OR 
  id IN (
    SELECT home_builder_id 
    FROM public.employees 
    WHERE id = auth.uid() AND confirmed = true
  )
);

-- Create separate policies for other operations
CREATE POLICY "Users can update their own profile" 
ON public.users 
FOR UPDATE 
USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" 
ON public.users 
FOR INSERT 
WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can delete their own profile" 
ON public.users 
FOR DELETE 
USING (auth.uid() = id);