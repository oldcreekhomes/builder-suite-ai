-- Cleanup duplicate owner company names (keeps newest row per company_name)
-- Specifically remove the known typo-signup row so we can enforce uniqueness.
DELETE FROM public.users
WHERE id = '8bfa0545-8bf7-4034-bacc-f0e7957f4be6';

-- Add unique constraint for company names among owners (case-insensitive)
CREATE UNIQUE INDEX unique_company_name_for_owners
ON public.users (LOWER(company_name))
WHERE role = 'owner' AND company_name IS NOT NULL;