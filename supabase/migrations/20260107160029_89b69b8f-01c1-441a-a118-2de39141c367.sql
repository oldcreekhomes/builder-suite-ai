-- Fix the unbalanced deposit where header amount ($5000) doesn't match line items total ($3000)
UPDATE deposits 
SET amount = 3000 
WHERE id = '4cc5ace9-811a-4745-85ba-70503ee45d02';

-- Fix the corresponding journal entry bank debit line
UPDATE journal_entry_lines 
SET debit = 3000 
WHERE journal_entry_id = 'e1e6c339-6004-47c1-856c-1bd9697d124d' 
  AND debit = 5000;