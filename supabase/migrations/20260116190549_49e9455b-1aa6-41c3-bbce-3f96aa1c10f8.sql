-- Drop the existing check constraint
ALTER TABLE marketplace_companies DROP CONSTRAINT IF EXISTS marketplace_companies_company_type_check;

-- Recreate with Lender included alongside existing types
ALTER TABLE marketplace_companies ADD CONSTRAINT marketplace_companies_company_type_check 
CHECK (company_type IN ('Subcontractor', 'Vendor', 'Municipality', 'Consultant', 'Finance', 'Lender'));