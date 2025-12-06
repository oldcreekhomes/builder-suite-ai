-- Drop the existing unique constraint that doesn't include project_id
DROP INDEX IF EXISTS unique_completed_reconciliation_per_date;

-- Create the corrected unique constraint that includes project_id
-- This allows each project to complete its own reconciliation for any bank account and statement date
CREATE UNIQUE INDEX unique_completed_reconciliation_per_date 
ON public.bank_reconciliations 
USING btree (bank_account_id, project_id, statement_date) 
WHERE (status = 'completed'::text);