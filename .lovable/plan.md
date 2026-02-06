
# Populate "Sent On" Dates for Existing Bid Packages

## Summary
The "Sent On" column was successfully added to the UI but shows "mm/dd/yyyy" for all existing bid packages because they were sent before the feature was implemented. We need to backfill the `sent_on` data for all existing sent and closed bid packages.

## Solution Approach
Run a database migration that populates the `sent_on` field for existing records using the best available historical data:

1. **Primary source**: Use the earliest `project_bids.created_at` timestamp for each bid package (this is when the first company was added to receive the bid)
2. **Fallback source**: For bid packages without any associated bids, use the `project_bid_packages.created_at` timestamp

## Database Migration

The migration will:
1. Update all "sent" and "closed" bid packages that have associated project_bids records, setting `sent_on` to the earliest bid creation date
2. Update remaining "sent" and "closed" bid packages (without bids) to use their own `created_at` as the `sent_on` date

```sql
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
```

## Data Impact
- 348 closed bid packages will be updated
- 93 sent bid packages will be updated
- Draft bid packages will remain with `sent_on = NULL` (as expected)

## Expected Result
After the migration, all bid packages in the "Bidding" and "Closed" tabs will show their actual sent dates in the "Sent On" column instead of "mm/dd/yyyy".

## Files to Modify
1. `supabase/migrations/[timestamp]_backfill_sent_on_dates.sql` (new file)
