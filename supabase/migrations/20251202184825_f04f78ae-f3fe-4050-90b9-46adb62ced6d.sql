-- Fix 3: Correct the beginning balance to $64.50 for the in-progress reconciliation
UPDATE bank_reconciliations 
SET statement_beginning_balance = 64.50
WHERE status = 'in_progress' 
  AND bank_account_id = '27ed0c3a-be95-4367-aa21-1a2b51ea1585'
  AND statement_date = '2025-11-30';