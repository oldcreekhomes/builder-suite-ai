-- Update legacy "Paid" notes to include user attribution and timestamp
UPDATE bills b
SET notes = (
  SELECT COALESCE(u.first_name || ' ' || u.last_name, 'System') || ' | ' || 
         TO_CHAR(b.updated_at AT TIME ZONE 'UTC', 'MM/DD/YYYY') || ': Paid'
  FROM users u
  WHERE u.id = b.created_by
)
WHERE b.notes = 'Paid' AND b.notes IS NOT NULL;

-- Update legacy notes that have "UserName: Content" format (no date/pipe separator)
-- These are notes that contain a colon but no pipe separator
UPDATE bills b
SET notes = regexp_replace(
  b.notes,
  '^([^:]+):\s*(.+)$',
  '\1 | ' || TO_CHAR(b.updated_at AT TIME ZONE 'UTC', 'MM/DD/YYYY') || ': \2'
)
WHERE b.notes IS NOT NULL 
  AND b.notes != ''
  AND b.notes NOT LIKE '%|%'
  AND b.notes LIKE '%:%'
  AND b.notes != 'Paid';