-- Clear orphaned reconciliation data from deposits pointing to non-existent reconciliations
UPDATE deposits d
SET 
  reconciled = false,
  reconciliation_id = NULL,
  reconciliation_date = NULL
WHERE d.reconciliation_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM bank_reconciliations br 
    WHERE br.id = d.reconciliation_id
  );

-- Clear orphaned reconciliation data from checks pointing to non-existent reconciliations
UPDATE checks c
SET 
  reconciled = false,
  reconciliation_id = NULL,
  reconciliation_date = NULL
WHERE c.reconciliation_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM bank_reconciliations br 
    WHERE br.id = c.reconciliation_id
  );

-- Clear orphaned reconciliation data from bills pointing to non-existent reconciliations
UPDATE bills b
SET 
  reconciled = false,
  reconciliation_id = NULL,
  reconciliation_date = NULL
WHERE b.reconciliation_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM bank_reconciliations br 
    WHERE br.id = b.reconciliation_id
  );

-- Clear orphaned reconciliation data from credit_cards pointing to non-existent reconciliations
UPDATE credit_cards cc
SET 
  reconciled = false,
  reconciliation_id = NULL,
  reconciliation_date = NULL
WHERE cc.reconciliation_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM bank_reconciliations br 
    WHERE br.id = cc.reconciliation_id
  );