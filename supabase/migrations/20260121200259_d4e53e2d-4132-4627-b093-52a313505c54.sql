-- Mark journal entries as reversed when their source bill is reversed
-- This cleans up orphaned entries that appear in reconciliation but shouldn't
UPDATE journal_entries 
SET reversed_at = NOW()
WHERE source_type = 'bill_payment'
  AND reversed_at IS NULL
  AND is_reversal = false
  AND source_id IN (
    SELECT id FROM bills WHERE status = 'reversed'
  );