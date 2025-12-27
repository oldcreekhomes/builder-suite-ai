-- Add column for manual QuickBooks reconciliation date
ALTER TABLE projects 
ADD COLUMN qb_last_reconciliation_date date;