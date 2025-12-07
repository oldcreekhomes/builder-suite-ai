-- Add lot_id column to journal_entry_lines for lot allocation tracking
ALTER TABLE journal_entry_lines 
ADD COLUMN lot_id UUID REFERENCES project_lots(id) ON DELETE SET NULL;

-- Create index for efficient lot-based queries
CREATE INDEX idx_journal_entry_lines_lot_id ON journal_entry_lines(lot_id);

-- Backfill existing journal entry lines with lot_id from bill_lines
UPDATE journal_entry_lines
SET lot_id = bl.lot_id
FROM journal_entries je, bills b, bill_lines bl
WHERE journal_entry_lines.journal_entry_id = je.id
  AND je.source_id = b.id 
  AND je.source_type = 'bill'
  AND bl.bill_id = b.id 
  AND bl.cost_code_id = journal_entry_lines.cost_code_id
  AND COALESCE(bl.project_id, b.project_id) = journal_entry_lines.project_id
  AND journal_entry_lines.lot_id IS NULL
  AND bl.lot_id IS NOT NULL;