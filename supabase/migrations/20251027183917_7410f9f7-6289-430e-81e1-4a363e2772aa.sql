-- Delete the $200 credit bill to Old Creek Homes and all associated records

-- First, delete journal entry lines
DELETE FROM journal_entry_lines
WHERE journal_entry_id IN (
  SELECT je.id 
  FROM journal_entries je
  JOIN bills b ON je.source_id = b.id AND je.source_type = 'bill'
  WHERE b.total_amount = -200.00
  AND b.reference_number = '1234'
  AND b.bill_date = '2025-10-27'
);

-- Delete journal entries
DELETE FROM journal_entries
WHERE source_type = 'bill'
AND source_id IN (
  SELECT id FROM bills
  WHERE total_amount = -200.00
  AND reference_number = '1234'
  AND bill_date = '2025-10-27'
);

-- Delete bill lines
DELETE FROM bill_lines
WHERE bill_id IN (
  SELECT id FROM bills
  WHERE total_amount = -200.00
  AND reference_number = '1234'
  AND bill_date = '2025-10-27'
);

-- Finally, delete the bill
DELETE FROM bills
WHERE total_amount = -200.00
AND reference_number = '1234'
AND bill_date = '2025-10-27';