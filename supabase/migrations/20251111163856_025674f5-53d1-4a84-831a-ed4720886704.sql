-- Add file_path column to cost_code_price_history table
ALTER TABLE cost_code_price_history 
ADD COLUMN file_path TEXT;

COMMENT ON COLUMN cost_code_price_history.file_path IS 'Storage path for uploaded price proposal files';