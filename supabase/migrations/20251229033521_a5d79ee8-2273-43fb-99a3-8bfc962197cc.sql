-- Update the CHECK constraint on companies table to include 'Lender' and 'Utility'
ALTER TABLE public.companies DROP CONSTRAINT IF EXISTS companies_company_type_check;
ALTER TABLE public.companies ADD CONSTRAINT companies_company_type_check 
CHECK (company_type IN ('Subcontractor', 'Vendor', 'Municipality', 'Consultant', 'Lender', 'Utility'));