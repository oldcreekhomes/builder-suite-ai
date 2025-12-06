-- Add column to store checked transaction IDs for in-progress reconciliations
ALTER TABLE public.bank_reconciliations 
ADD COLUMN IF NOT EXISTS checked_transaction_ids text[] DEFAULT '{}';