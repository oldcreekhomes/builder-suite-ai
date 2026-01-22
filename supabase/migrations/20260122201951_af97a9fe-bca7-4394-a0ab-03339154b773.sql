-- Update the check constraint to allow 'submitted' status
ALTER TABLE project_bids 
DROP CONSTRAINT project_bidding_bid_package_companies_bid_status_check;

ALTER TABLE project_bids 
ADD CONSTRAINT project_bidding_bid_package_companies_bid_status_check 
CHECK (bid_status = ANY (ARRAY['will_bid'::text, 'will_not_bid'::text, 'submitted'::text]));

-- Fix existing bids that have price but still show as will_bid
UPDATE project_bids 
SET bid_status = 'submitted' 
WHERE price IS NOT NULL 
  AND price > 0 
  AND bid_status = 'will_bid';