-- Add has_subcategories column to cost_codes table
ALTER TABLE public.cost_codes 
ADD COLUMN has_subcategories boolean DEFAULT false;