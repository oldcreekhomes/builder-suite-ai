-- Add lot_id column to pending_bill_lines for storing lot assignments on pending bills
ALTER TABLE pending_bill_lines ADD COLUMN lot_id UUID REFERENCES project_lots(id);

-- Create index for performance
CREATE INDEX idx_pending_bill_lines_lot_id ON pending_bill_lines(lot_id);