-- First, let's check if there are any existing representatives without emails
-- We'll update them with a placeholder that needs to be filled
UPDATE public.company_representatives 
SET email = 'email-required@placeholder.com' 
WHERE email IS NULL OR email = '';

-- Now make email required and last_name optional
ALTER TABLE public.company_representatives 
ALTER COLUMN email SET NOT NULL;

ALTER TABLE public.company_representatives 
ALTER COLUMN last_name DROP NOT NULL;