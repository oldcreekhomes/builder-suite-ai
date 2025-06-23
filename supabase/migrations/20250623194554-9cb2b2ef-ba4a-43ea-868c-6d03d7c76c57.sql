
-- Add the missing phone_number column to the companies table
ALTER TABLE public.companies 
ADD COLUMN phone_number text;
