-- Remove is_primary column from company_representatives table
ALTER TABLE public.company_representatives DROP COLUMN IF EXISTS is_primary;

-- Remove is_primary column from marketplace_company_representatives table  
ALTER TABLE public.marketplace_company_representatives DROP COLUMN IF EXISTS is_primary;