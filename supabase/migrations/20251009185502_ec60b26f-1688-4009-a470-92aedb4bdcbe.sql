
-- Fix existing deposit journal entry for 6119 11th Street
-- Update the bank DEBIT line to include project_id so it appears on the Balance Sheet

UPDATE journal_entry_lines
SET project_id = 'a50ae540-913d-481f-8e9f-72b64fa5a362'
WHERE id = '13279c51-6bb8-4b4b-8006-32f7c71b52aa'
  AND project_id IS NULL;
