-- Clean up trailing and leading spaces in first_name and last_name
UPDATE public.company_representatives 
SET 
  first_name = TRIM(first_name),
  last_name = TRIM(last_name)
WHERE 
  first_name != TRIM(first_name) OR 
  last_name != TRIM(last_name);