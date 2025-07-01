
-- Remove quantity and unit_price columns from project_bidding table
ALTER TABLE public.project_bidding 
DROP COLUMN IF EXISTS quantity,
DROP COLUMN IF EXISTS unit_price;
