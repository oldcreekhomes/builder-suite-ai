ALTER TABLE public.pending_bill_lines
ADD COLUMN IF NOT EXISTS purchase_order_line_id uuid REFERENCES public.purchase_order_lines(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_pending_bill_lines_po_line_id
  ON public.pending_bill_lines(purchase_order_line_id);