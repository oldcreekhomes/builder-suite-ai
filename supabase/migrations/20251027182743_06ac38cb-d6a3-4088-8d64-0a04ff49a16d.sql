-- Drop check constraints that prevent negative amounts in bill_lines
-- This allows bill credits (negative amounts) to be created

-- Drop the quantity >= 0 constraint
ALTER TABLE public.bill_lines 
DROP CONSTRAINT IF EXISTS bill_lines_quantity_check;

-- Drop the amount >= 0 constraint  
ALTER TABLE public.bill_lines 
DROP CONSTRAINT IF EXISTS bill_lines_amount_check;