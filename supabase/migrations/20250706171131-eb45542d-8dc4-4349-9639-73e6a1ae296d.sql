-- Clean up redundant bidding tables and update structure

-- Drop the old redundant tables
DROP TABLE IF EXISTS public.project_bidding_companies CASCADE;
DROP TABLE IF EXISTS public.project_bidding CASCADE;
DROP TABLE IF EXISTS public.project_bidding_bid_package_files CASCADE;

-- Add files array to bid packages table (if not already present)
ALTER TABLE public.project_bidding_bid_packages 
ADD COLUMN IF NOT EXISTS files TEXT[] DEFAULT '{}';

-- Ensure proposals column exists in bid package companies table
-- (This should already exist based on the schema, but making sure)
-- ALTER TABLE public.project_bidding_bid_package_companies 
-- ADD COLUMN IF NOT EXISTS proposals TEXT[] DEFAULT '{}';

-- Update any existing data to ensure arrays are properly initialized
UPDATE public.project_bidding_bid_packages 
SET files = '{}' 
WHERE files IS NULL;

UPDATE public.project_bidding_bid_package_companies 
SET proposals = '{}' 
WHERE proposals IS NULL;