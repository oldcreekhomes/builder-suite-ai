-- Add a timestamp to track when the company confirmed they will bid
-- This allows "Will Bid" notifications to persist even after the bid is submitted
ALTER TABLE project_bids ADD COLUMN will_bid_at timestamptz;

-- Backfill: For existing records that had will_bid status or have been submitted
-- (meaning they said will_bid at some point), set the timestamp using updated_at as approximation
UPDATE project_bids 
SET will_bid_at = updated_at 
WHERE bid_status IN ('will_bid', 'submitted') 
  AND will_bid_at IS NULL;