
-- Step 1: Delete the 2 bad Advantage Landscape duplicates
DELETE FROM public.marketplace_companies WHERE id IN ('7c172b20-2361-4448-8df4-d2d14d5cd7d8', '1f2ad73e-b674-46c0-b512-0b302affd37d');

-- Step 2: Insert the correct Advantage Landscape company and Crystal Partin
DO $$
DECLARE
  new_company_id uuid;
BEGIN
  INSERT INTO public.marketplace_companies (company_name, company_type, phone_number, website, source)
  VALUES ('Advantage Landscape', 'Landscaping Contractor', '703-398-4715', 'https://advantagelandscape.com/', 'manual')
  RETURNING id INTO new_company_id;

  INSERT INTO public.marketplace_company_representatives (marketplace_company_id, first_name, last_name, title, email, phone_number)
  VALUES (new_company_id, 'Crystal', 'Partin', 'Director of Business Development', 'cpartin@advantagelandscape.com', '703-398-4715');
END $$;
