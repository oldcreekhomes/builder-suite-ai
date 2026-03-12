-- Function to normalize phone numbers to xxx-xxx-xxxx format
CREATE OR REPLACE FUNCTION public.normalize_phone_number(phone text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  digits text;
BEGIN
  IF phone IS NULL OR phone = '' THEN
    RETURN phone;
  END IF;
  
  -- Strip all non-digit characters
  digits := regexp_replace(phone, '[^0-9]', '', 'g');
  
  -- Handle 11-digit numbers starting with 1 (US country code)
  IF length(digits) = 11 AND digits LIKE '1%' THEN
    digits := substring(digits from 2);
  END IF;
  
  -- Format as xxx-xxx-xxxx if 10 digits
  IF length(digits) = 10 THEN
    RETURN substring(digits from 1 for 3) || '-' || 
           substring(digits from 4 for 3) || '-' || 
           substring(digits from 7 for 4);
  END IF;
  
  -- Return original if not a standard 10-digit number
  RETURN phone;
END;
$$;

-- Normalize existing phone numbers in company_representatives
UPDATE public.company_representatives 
SET phone_number = normalize_phone_number(phone_number)
WHERE phone_number IS NOT NULL 
  AND phone_number != '';

-- Normalize existing phone numbers in users table
UPDATE public.users 
SET phone_number = normalize_phone_number(phone_number)
WHERE phone_number IS NOT NULL 
  AND phone_number != '';

-- Normalize existing phone numbers in companies table
UPDATE public.companies 
SET phone_number = normalize_phone_number(phone_number)
WHERE phone_number IS NOT NULL 
  AND phone_number != '';

-- Create trigger to auto-format on insert/update for company_representatives
CREATE OR REPLACE FUNCTION public.normalize_phone_on_save()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.phone_number IS NOT NULL AND NEW.phone_number != '' THEN
    NEW.phone_number := normalize_phone_number(NEW.phone_number);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS normalize_phone_company_reps ON public.company_representatives;
CREATE TRIGGER normalize_phone_company_reps
  BEFORE INSERT OR UPDATE OF phone_number ON public.company_representatives
  FOR EACH ROW EXECUTE FUNCTION normalize_phone_on_save();

DROP TRIGGER IF EXISTS normalize_phone_users ON public.users;
CREATE TRIGGER normalize_phone_users
  BEFORE INSERT OR UPDATE OF phone_number ON public.users
  FOR EACH ROW EXECUTE FUNCTION normalize_phone_on_save();

DROP TRIGGER IF EXISTS normalize_phone_companies ON public.companies;
CREATE TRIGGER normalize_phone_companies
  BEFORE INSERT OR UPDATE OF phone_number ON public.companies
  FOR EACH ROW EXECUTE FUNCTION normalize_phone_on_save();