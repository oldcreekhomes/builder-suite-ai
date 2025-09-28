-- Add structured address fields to companies table
ALTER TABLE companies 
ADD COLUMN address_line_1 TEXT,
ADD COLUMN address_line_2 TEXT,
ADD COLUMN city TEXT,
ADD COLUMN state TEXT,
ADD COLUMN zip_code TEXT;

-- Create function to migrate existing address data
CREATE OR REPLACE FUNCTION migrate_company_addresses()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  company_record RECORD;
BEGIN
  FOR company_record IN 
    SELECT id, address FROM public.companies 
    WHERE address IS NOT NULL AND address != '' 
    AND (address_line_1 IS NULL OR address_line_1 = '')
  LOOP
    -- Simple migration: put full address in address_line_1
    UPDATE public.companies 
    SET address_line_1 = company_record.address
    WHERE id = company_record.id;
  END LOOP;
END;
$$;

-- Run the migration
SELECT migrate_company_addresses();

-- Drop the migration function as it's no longer needed
DROP FUNCTION migrate_company_addresses();