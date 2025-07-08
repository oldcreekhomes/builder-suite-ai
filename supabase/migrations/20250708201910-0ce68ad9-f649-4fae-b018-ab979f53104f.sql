-- Add policy to allow employees to view other employees in their company
CREATE POLICY "Employees can view coworkers in same company" 
ON public.employees 
FOR SELECT 
USING (
  -- Allow if the requesting user is an employee in the same company
  home_builder_id IN (
    SELECT e.home_builder_id 
    FROM public.employees e 
    WHERE e.id = auth.uid() AND e.confirmed = true
  )
);