-- Add terms column to companies table to store vendor payment terms
ALTER TABLE public.companies 
ADD COLUMN terms text;