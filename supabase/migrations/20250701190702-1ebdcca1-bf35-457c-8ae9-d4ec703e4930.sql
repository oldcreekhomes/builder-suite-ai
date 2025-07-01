
-- Remove all existing marketplace companies (sample data)
DELETE FROM public.marketplace_companies;

-- Also remove their associated representatives
DELETE FROM public.marketplace_company_representatives;
