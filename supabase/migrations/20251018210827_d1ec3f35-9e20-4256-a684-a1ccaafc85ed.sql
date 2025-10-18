-- Add estimate column to cost_codes table
ALTER TABLE cost_codes 
ADD COLUMN estimate boolean DEFAULT false;

-- Add index for faster queries on estimate-enabled cost codes
CREATE INDEX idx_cost_codes_estimate ON cost_codes(estimate) WHERE estimate = true;

-- Add helpful comment
COMMENT ON COLUMN cost_codes.estimate IS 'When true, this cost code automatically appears in takeoff items for estimation';