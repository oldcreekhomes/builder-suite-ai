-- Fix the specific journal entry line that has wrong lot_id (the $5,000 line for Lot 2)
UPDATE journal_entry_lines
SET lot_id = '6cb1523e-0335-4f2f-9a25-0d74eccd9dbd'
WHERE id = 'fddc2354-8bdc-440e-bc70-62cc66076a0a';

-- Improved backfill for any other affected records: match by amount AND cost_code
UPDATE journal_entry_lines jel
SET lot_id = bl.lot_id
FROM journal_entries je, bills b, bill_lines bl
WHERE jel.journal_entry_id = je.id
  AND je.source_id = b.id 
  AND je.source_type = 'bill'
  AND bl.bill_id = b.id 
  AND bl.cost_code_id = jel.cost_code_id
  AND COALESCE(bl.project_id, b.project_id) = jel.project_id
  AND bl.amount = jel.debit
  AND jel.lot_id IS NULL
  AND bl.lot_id IS NOT NULL;