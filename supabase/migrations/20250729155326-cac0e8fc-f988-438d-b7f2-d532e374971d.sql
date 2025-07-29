-- Allow NULL values for bid_status in project_bid_package_companies table
-- This represents "sent but no response yet" state
ALTER TABLE project_bid_package_companies 
ALTER COLUMN bid_status DROP NOT NULL;

-- Update the default value to be NULL instead of 'will_bid'
ALTER TABLE project_bid_package_companies 
ALTER COLUMN bid_status SET DEFAULT NULL;