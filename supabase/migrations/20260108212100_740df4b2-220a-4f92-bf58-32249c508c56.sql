-- Complete fix for Old Creek Homes deposit - update remaining records from $3,000 to $5,000

-- Fix deposit line amount
UPDATE deposit_lines
SET amount = 5000
WHERE deposit_id = '4cc5ace9-811a-4745-85ba-70503ee45d02'
  AND amount = 3000;

-- Fix Equity account journal entry line (credit side)
UPDATE journal_entry_lines
SET credit = 5000
WHERE journal_entry_id = 'e1e6c339-6004-47c1-856c-1bd9697d124d'
  AND account_id = '6ee988a6-b14e-415a-a50d-11d593a514bd'
  AND credit = 3000;