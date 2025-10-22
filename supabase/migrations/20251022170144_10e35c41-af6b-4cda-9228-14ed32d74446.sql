
-- Add selected_bid_id column to project_budgets table to link budget items to vendor bids
ALTER TABLE project_budgets 
ADD COLUMN selected_bid_id uuid REFERENCES project_bids(id) ON DELETE SET NULL;

-- Create index for better query performance
CREATE INDEX idx_project_budgets_selected_bid ON project_budgets(selected_bid_id) WHERE selected_bid_id IS NOT NULL;

COMMENT ON COLUMN project_budgets.selected_bid_id IS 'References a vendor bid that overrides calculated or manual pricing';
