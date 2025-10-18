-- Add reconciliation tracking fields to bills table
ALTER TABLE bills 
  ADD COLUMN IF NOT EXISTS reconciled boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS reconciliation_id uuid REFERENCES bank_reconciliations(id),
  ADD COLUMN IF NOT EXISTS reconciliation_date date;

-- Add indexes for reconciliation queries
CREATE INDEX IF NOT EXISTS idx_bills_reconciled ON bills(reconciled);
CREATE INDEX IF NOT EXISTS idx_bills_reconciliation_id ON bills(reconciliation_id);