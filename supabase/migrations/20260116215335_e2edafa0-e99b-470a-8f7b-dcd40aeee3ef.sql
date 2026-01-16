-- Add cost_code_id column to deposit_lines for Job Cost deposit entries
ALTER TABLE deposit_lines 
ADD COLUMN cost_code_id uuid REFERENCES cost_codes(id);

-- Backfill cost_code_id from journal_entry_lines to deposit_lines
UPDATE deposit_lines dl
SET cost_code_id = jel.cost_code_id,
    updated_at = NOW()
FROM journal_entries je
JOIN journal_entry_lines jel ON jel.journal_entry_id = je.id
WHERE je.source_type = 'deposit'
  AND je.source_id = dl.deposit_id
  AND dl.line_type = 'customer_payment'
  AND jel.cost_code_id IS NOT NULL
  AND dl.cost_code_id IS NULL;