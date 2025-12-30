-- Merge company_category into company_type where needed
UPDATE companies 
SET company_type = company_category 
WHERE company_type IS NULL OR company_type = '';

-- For any remaining nulls, default to Vendor
UPDATE companies 
SET company_type = 'Vendor' 
WHERE company_type IS NULL;

-- Remove the company_category column
ALTER TABLE companies DROP COLUMN IF EXISTS company_category;

-- Add NOT NULL constraint to company_type
ALTER TABLE companies ALTER COLUMN company_type SET NOT NULL;