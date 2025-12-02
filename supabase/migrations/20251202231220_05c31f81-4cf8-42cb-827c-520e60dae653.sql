-- Step 1: Clear reconciliation references from deposits
UPDATE deposits 
SET reconciled = false, reconciliation_id = NULL, reconciliation_date = NULL
WHERE reconciliation_id IN (
  SELECT br.id FROM bank_reconciliations br
  JOIN accounts a ON br.bank_account_id = a.id
  WHERE a.name LIKE '%Sandy Spring%'
);

-- Step 2: Clear reconciliation references from checks
UPDATE checks 
SET reconciled = false, reconciliation_id = NULL, reconciliation_date = NULL
WHERE reconciliation_id IN (
  SELECT br.id FROM bank_reconciliations br
  JOIN accounts a ON br.bank_account_id = a.id
  WHERE a.name LIKE '%Sandy Spring%'
);

-- Step 3: Clear reconciliation references from bills
UPDATE bills 
SET reconciled = false, reconciliation_id = NULL, reconciliation_date = NULL
WHERE reconciliation_id IN (
  SELECT br.id FROM bank_reconciliations br
  JOIN accounts a ON br.bank_account_id = a.id
  WHERE a.name LIKE '%Sandy Spring%'
);

-- Step 4: Clear reconciliation references from credit_cards
UPDATE credit_cards 
SET reconciled = false, reconciliation_id = NULL, reconciliation_date = NULL
WHERE reconciliation_id IN (
  SELECT br.id FROM bank_reconciliations br
  JOIN accounts a ON br.bank_account_id = a.id
  WHERE a.name LIKE '%Sandy Spring%'
);

-- Step 5: Delete all reconciliation records for Sandy Spring Bank
DELETE FROM bank_reconciliations 
WHERE bank_account_id IN (
  SELECT id FROM accounts WHERE name LIKE '%Sandy Spring%'
);