-- First just clean up the duplicate data - keep only 7d75dd7a-19db-45c9-b1c3-a717ef4df895 ($64.50) for 10/31

-- Clear FK references first
UPDATE bills 
SET reconciliation_id = NULL, reconciled = false, reconciliation_date = NULL
WHERE reconciliation_id IN (
  '93f3e416-6ea8-48fc-b50b-83bf9c383b38',
  '216983a0-8f57-4a0a-a4f8-303499ce8784',
  '0f3556c2-e0f8-4471-af8d-0bc8664eb72e'
);

-- Delete 3 duplicates, keep only the correct one ($64.50)
DELETE FROM bank_reconciliations 
WHERE id IN (
  '93f3e416-6ea8-48fc-b50b-83bf9c383b38',
  '216983a0-8f57-4a0a-a4f8-303499ce8784',
  '0f3556c2-e0f8-4471-af8d-0bc8664eb72e'
);