-- Revert the database changes to project_bid_package_companies table
-- First, update any NULL bid_status values back to 'will_bid'
UPDATE project_bid_package_companies 
SET bid_status = 'will_bid' 
WHERE bid_status IS NULL;

-- Then restore the NOT NULL constraint and default value
ALTER TABLE project_bid_package_companies 
ALTER COLUMN bid_status SET DEFAULT 'will_bid'::text;

ALTER TABLE project_bid_package_companies 
ALTER COLUMN bid_status SET NOT NULL;