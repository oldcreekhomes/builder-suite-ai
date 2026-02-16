
-- Add purchase_order_line_id column to bill_lines
ALTER TABLE public.bill_lines
ADD COLUMN purchase_order_line_id uuid REFERENCES public.purchase_order_lines(id) ON DELETE SET NULL;

-- Create index for performance
CREATE INDEX idx_bill_lines_purchase_order_line_id ON public.bill_lines(purchase_order_line_id);
