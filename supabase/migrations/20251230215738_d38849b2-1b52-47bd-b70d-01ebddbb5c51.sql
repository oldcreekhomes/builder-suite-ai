-- Step 1: Add company_category column to companies table
ALTER TABLE public.companies 
ADD COLUMN company_category text;

-- Step 2: Migrate existing data - set category based on current company_type
UPDATE public.companies 
SET company_category = CASE 
  WHEN company_type = 'Subcontractor' THEN 'Subcontractor'
  ELSE 'Vendor'
END;

-- Step 3: Make company_category NOT NULL after data migration
ALTER TABLE public.companies 
ALTER COLUMN company_category SET NOT NULL;

-- Step 4: Remove NOT NULL constraint from company_type (Subcontractors won't have a type)
ALTER TABLE public.companies 
ALTER COLUMN company_type DROP NOT NULL;

-- Step 5: For Subcontractors, clear the company_type (they don't have subtypes)
UPDATE public.companies 
SET company_type = NULL 
WHERE company_category = 'Subcontractor';

-- Step 6: Add 'Lender' as a valid type by migrating deposit_sources into companies
INSERT INTO public.companies (home_builder_id, company_name, company_category, company_type, address, phone_number)
SELECT 
  ds.owner_id,
  ds.customer_name,
  'Vendor',
  'Lender',
  COALESCE(ds.address, '') || CASE WHEN ds.city IS NOT NULL THEN ', ' || ds.city ELSE '' END || CASE WHEN ds.state IS NOT NULL THEN ', ' || ds.state ELSE '' END || CASE WHEN ds.zip_code IS NOT NULL THEN ' ' || ds.zip_code ELSE '' END,
  ds.phone_number
FROM public.deposit_sources ds
WHERE NOT EXISTS (
  SELECT 1 FROM public.companies c 
  WHERE LOWER(c.company_name) = LOWER(ds.customer_name) 
  AND c.home_builder_id = ds.owner_id
);

-- Step 7: Update deposits to reference companies instead of deposit_sources
-- First add new column for company reference
ALTER TABLE public.deposits 
ADD COLUMN company_id uuid REFERENCES public.companies(id);

-- Step 8: Migrate deposit_source_id references to company_id
UPDATE public.deposits d
SET company_id = (
  SELECT c.id 
  FROM public.companies c
  JOIN public.deposit_sources ds ON ds.id = d.deposit_source_id
  WHERE LOWER(c.company_name) = LOWER(ds.customer_name)
  AND c.home_builder_id = ds.owner_id
  LIMIT 1
)
WHERE d.deposit_source_id IS NOT NULL;

-- Step 9: Drop the old foreign key and column
ALTER TABLE public.deposits 
DROP COLUMN deposit_source_id;

-- Step 10: Drop the deposit_sources table
DROP TABLE public.deposit_sources;

-- Step 11: Add check constraint for valid company_category values
ALTER TABLE public.companies 
ADD CONSTRAINT valid_company_category CHECK (company_category IN ('Subcontractor', 'Vendor'));