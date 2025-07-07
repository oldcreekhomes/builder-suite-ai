-- Update company_representatives policies to allow employees access
-- Drop existing policies
DROP POLICY IF EXISTS "Users can view representatives of their companies" ON public.company_representatives;
DROP POLICY IF EXISTS "Users can create representatives for their companies" ON public.company_representatives;
DROP POLICY IF EXISTS "Users can update representatives of their companies" ON public.company_representatives;
DROP POLICY IF EXISTS "Users can delete representatives of their companies" ON public.company_representatives;

-- Create new policies that allow both home builders and their confirmed employees
CREATE POLICY "Home builders and employees can view representatives" 
ON public.company_representatives 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM companies 
  WHERE companies.id = company_representatives.company_id 
  AND (
    companies.owner_id = auth.uid() 
    OR 
    companies.owner_id IN (
      SELECT employees.home_builder_id 
      FROM employees 
      WHERE employees.id = auth.uid() AND employees.confirmed = true
    )
  )
));

CREATE POLICY "Home builders and employees can create representatives" 
ON public.company_representatives 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM companies 
  WHERE companies.id = company_representatives.company_id 
  AND (
    companies.owner_id = auth.uid() 
    OR 
    companies.owner_id IN (
      SELECT employees.home_builder_id 
      FROM employees 
      WHERE employees.id = auth.uid() AND employees.confirmed = true
    )
  )
));

CREATE POLICY "Home builders and employees can update representatives" 
ON public.company_representatives 
FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM companies 
  WHERE companies.id = company_representatives.company_id 
  AND (
    companies.owner_id = auth.uid() 
    OR 
    companies.owner_id IN (
      SELECT employees.home_builder_id 
      FROM employees 
      WHERE employees.id = auth.uid() AND employees.confirmed = true
    )
  )
));

CREATE POLICY "Home builders and employees can delete representatives" 
ON public.company_representatives 
FOR DELETE 
USING (EXISTS (
  SELECT 1 FROM companies 
  WHERE companies.id = company_representatives.company_id 
  AND (
    companies.owner_id = auth.uid() 
    OR 
    companies.owner_id IN (
      SELECT employees.home_builder_id 
      FROM employees 
      WHERE employees.id = auth.uid() AND employees.confirmed = true
    )
  )
));