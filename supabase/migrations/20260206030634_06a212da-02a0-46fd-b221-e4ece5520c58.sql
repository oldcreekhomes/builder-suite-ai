-- Backfill sent_on dates for existing bid packages

-- Step 1: Update sent_on from earliest project_bid for packages with bids
UPDATE project_bid_packages bp
SET sent_on = earliest_bid.first_bid_date
FROM (
  SELECT 
    bid_package_id,
    MIN(created_at) as first_bid_date
  FROM project_bids
  GROUP BY bid_package_id
) earliest_bid
WHERE bp.id = earliest_bid.bid_package_id
AND bp.status IN ('sent', 'closed')
AND bp.sent_on IS NULL;

-- Step 2: For packages without bids, use package created_at
UPDATE project_bid_packages
SET sent_on = created_at
WHERE status IN ('sent', 'closed')
AND sent_on IS NULL;