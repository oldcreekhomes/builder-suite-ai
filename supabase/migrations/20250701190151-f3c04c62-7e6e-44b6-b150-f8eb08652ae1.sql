
-- Update the company_type check constraint to include Finance
ALTER TABLE public.marketplace_companies 
DROP CONSTRAINT IF EXISTS marketplace_companies_company_type_check;

ALTER TABLE public.marketplace_companies 
ADD CONSTRAINT marketplace_companies_company_type_check 
CHECK (company_type IN ('Subcontractor', 'Vendor', 'Municipality', 'Consultant', 'Finance'));
