-- Add RLS policy to allow employees to view their home builder (owner)
CREATE POLICY "Employees can view their home builder" 
ON public.users 
FOR SELECT 
USING (
  -- Allow employees to see their home builder (owner)
  (role = 'owner' AND id IN (
    SELECT home_builder_id 
    FROM public.users 
    WHERE id = auth.uid() 
      AND role = 'employee' 
      AND confirmed = true
  ))
);