-- Add purchase_order_id to bill_lines for finalized bills
ALTER TABLE public.bill_lines 
ADD COLUMN purchase_order_id uuid REFERENCES project_purchase_orders(id);

-- Create index for efficient lookups
CREATE INDEX idx_bill_lines_purchase_order_id ON public.bill_lines(purchase_order_id);

-- Add purchase_order_id to pending_bill_lines for AI-extracted bills in review
ALTER TABLE public.pending_bill_lines 
ADD COLUMN purchase_order_id uuid REFERENCES project_purchase_orders(id);