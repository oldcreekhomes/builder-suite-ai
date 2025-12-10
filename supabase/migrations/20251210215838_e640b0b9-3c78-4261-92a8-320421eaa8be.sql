-- Add lot_id to check_lines
ALTER TABLE check_lines
ADD COLUMN lot_id UUID REFERENCES project_lots(id);

-- Add lot_id to credit_card_lines  
ALTER TABLE credit_card_lines
ADD COLUMN lot_id UUID REFERENCES project_lots(id);

-- Add indexes for performance
CREATE INDEX idx_check_lines_lot_id ON check_lines(lot_id);
CREATE INDEX idx_credit_card_lines_lot_id ON credit_card_lines(lot_id);