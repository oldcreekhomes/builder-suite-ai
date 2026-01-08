-- Fix Old Creek Homes deposit from October 8th, 2025 - restore to correct amount of $5,000
UPDATE deposits
SET amount = 5000
WHERE id = '4cc5ace9-811a-4745-85ba-70503ee45d02';

UPDATE journal_entry_lines
SET debit = 5000
WHERE journal_entry_id = 'e1e6c339-6004-47c1-856c-1bd9697d124d'
  AND debit = 3000;