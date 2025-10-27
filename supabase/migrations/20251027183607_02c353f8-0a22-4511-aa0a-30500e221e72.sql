-- Delete the 5 test credit bills and all associated records
-- This will delete bill lines, journal entries, and journal entry lines

-- First, find and delete journal entry lines for these bills
DELETE FROM journal_entry_lines
WHERE journal_entry_id IN (
  SELECT je.id 
  FROM journal_entries je
  JOIN bills b ON je.source_id = b.id AND je.source_type = 'bill'
  WHERE b.total_amount = -100.00
  AND b.bill_date = '2025-10-27'
);

-- Delete journal entries for these bills
DELETE FROM journal_entries
WHERE source_type = 'bill'
AND source_id IN (
  SELECT id FROM bills
  WHERE total_amount = -100.00
  AND bill_date = '2025-10-27'
);

-- Delete bill lines for these bills
DELETE FROM bill_lines
WHERE bill_id IN (
  SELECT id FROM bills
  WHERE total_amount = -100.00
  AND bill_date = '2025-10-27'
);

-- Finally, delete the bills themselves
DELETE FROM bills
WHERE total_amount = -100.00
AND bill_date = '2025-10-27';