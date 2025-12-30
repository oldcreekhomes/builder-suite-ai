-- Fix existing journal entry lines where project_id is inconsistent within the same journal entry
-- This updates NULL project_id lines to match other lines in the same journal entry
UPDATE journal_entry_lines jel
SET project_id = (
  SELECT DISTINCT project_id 
  FROM journal_entry_lines 
  WHERE journal_entry_id = jel.journal_entry_id 
    AND project_id IS NOT NULL
  LIMIT 1
)
WHERE jel.project_id IS NULL
  AND EXISTS (
    SELECT 1 FROM journal_entry_lines other
    WHERE other.journal_entry_id = jel.journal_entry_id
      AND other.project_id IS NOT NULL
  );