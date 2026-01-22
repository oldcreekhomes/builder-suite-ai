-- Reset all "Will Bid" notifications so they appear on all PM dashboards
-- This is a one-time fix to recover from the previous migration issue
UPDATE project_bids 
SET will_bid_acknowledged_by = NULL 
WHERE bid_status = 'will_bid';