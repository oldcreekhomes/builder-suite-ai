-- First, update any existing representatives without titles with a placeholder
UPDATE public.company_representatives 
SET title = 'Not Specified' 
WHERE title IS NULL OR title = '';

-- Now make title required
ALTER TABLE public.company_representatives 
ALTER COLUMN title SET NOT NULL;