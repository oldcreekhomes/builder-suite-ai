-- Add proper policy for employees to see colleagues from same company
-- This will enable full access to employee management and all other features

CREATE POLICY "Employees can view colleagues from same home builder" 
ON public.employees FOR SELECT
USING (
  home_builder_id IN (
    SELECT e.home_builder_id 
    FROM public.employees e 
    WHERE e.id = auth.uid() AND e.confirmed = true
  )
);