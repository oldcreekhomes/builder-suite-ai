-- Add reconciliation tracking columns to journal_entry_lines
ALTER TABLE public.journal_entry_lines
ADD COLUMN IF NOT EXISTS reconciled boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS reconciliation_id uuid REFERENCES public.bank_reconciliations(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS reconciliation_date date;

-- Create index for efficient querying of unreconciled journal entry lines
CREATE INDEX IF NOT EXISTS idx_journal_entry_lines_reconciled 
ON public.journal_entry_lines(reconciled) 
WHERE reconciled = false;

-- Create index for querying by account_id (for bank account filtering)
CREATE INDEX IF NOT EXISTS idx_journal_entry_lines_account_id 
ON public.journal_entry_lines(account_id);