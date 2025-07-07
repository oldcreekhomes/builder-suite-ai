-- Update cost_code_specifications RLS policies to allow employee access
-- Match the same pattern as cost_codes table policies

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Users can view specifications for their cost codes" ON public.cost_code_specifications;
DROP POLICY IF EXISTS "Users can create specifications for their cost codes" ON public.cost_code_specifications;
DROP POLICY IF EXISTS "Users can update specifications for their cost codes" ON public.cost_code_specifications;
DROP POLICY IF EXISTS "Users can delete specifications for their cost codes" ON public.cost_code_specifications;

-- Create new policies that allow both home builders and their approved employees
CREATE POLICY "Home builders and their approved employees can view specifications" 
ON public.cost_code_specifications 
FOR SELECT 
USING (EXISTS ( 
  SELECT 1
  FROM cost_codes
  WHERE cost_codes.id = cost_code_specifications.cost_code_id 
    AND (
      cost_codes.owner_id = auth.uid() 
      OR cost_codes.owner_id IN ( 
        SELECT employees.home_builder_id
        FROM employees
        WHERE employees.id = auth.uid() AND employees.confirmed = true
      )
    )
));

CREATE POLICY "Home builders and their approved employees can create specifications" 
ON public.cost_code_specifications 
FOR INSERT 
WITH CHECK (EXISTS ( 
  SELECT 1
  FROM cost_codes
  WHERE cost_codes.id = cost_code_specifications.cost_code_id 
    AND (
      cost_codes.owner_id = auth.uid() 
      OR cost_codes.owner_id IN ( 
        SELECT employees.home_builder_id
        FROM employees
        WHERE employees.id = auth.uid() AND employees.confirmed = true
      )
    )
));

CREATE POLICY "Home builders and their approved employees can update specifications" 
ON public.cost_code_specifications 
FOR UPDATE 
USING (EXISTS ( 
  SELECT 1
  FROM cost_codes
  WHERE cost_codes.id = cost_code_specifications.cost_code_id 
    AND (
      cost_codes.owner_id = auth.uid() 
      OR cost_codes.owner_id IN ( 
        SELECT employees.home_builder_id
        FROM employees
        WHERE employees.id = auth.uid() AND employees.confirmed = true
      )
    )
));

CREATE POLICY "Home builders and their approved employees can delete specifications" 
ON public.cost_code_specifications 
FOR DELETE 
USING (EXISTS ( 
  SELECT 1
  FROM cost_codes
  WHERE cost_codes.id = cost_code_specifications.cost_code_id 
    AND (
      cost_codes.owner_id = auth.uid() 
      OR cost_codes.owner_id IN ( 
        SELECT employees.home_builder_id
        FROM employees
        WHERE employees.id = auth.uid() AND employees.confirmed = true
      )
    )
));