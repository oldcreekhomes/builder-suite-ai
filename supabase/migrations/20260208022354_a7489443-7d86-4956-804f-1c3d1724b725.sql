-- Remove the restrictive company_type check constraint to allow all company types
ALTER TABLE marketplace_companies DROP CONSTRAINT IF EXISTS marketplace_companies_company_type_check;