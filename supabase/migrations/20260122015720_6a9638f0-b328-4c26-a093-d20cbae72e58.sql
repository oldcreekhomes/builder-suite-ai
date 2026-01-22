-- Add acknowledgment columns to project_bids for PM notifications
ALTER TABLE project_bids 
ADD COLUMN will_bid_acknowledged_by UUID REFERENCES auth.users(id),
ADD COLUMN bid_acknowledged_by UUID REFERENCES auth.users(id);