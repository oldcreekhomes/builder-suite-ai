ALTER TABLE public.bill_lines
  DROP CONSTRAINT IF EXISTS bill_lines_purchase_order_id_fkey;

ALTER TABLE public.bill_lines
  ADD CONSTRAINT bill_lines_purchase_order_id_fkey
  FOREIGN KEY (purchase_order_id)
  REFERENCES public.project_purchase_orders(id)
  ON DELETE SET NULL;

ALTER TABLE public.pending_bill_lines
  DROP CONSTRAINT IF EXISTS pending_bill_lines_purchase_order_id_fkey;

ALTER TABLE public.pending_bill_lines
  ADD CONSTRAINT pending_bill_lines_purchase_order_id_fkey
  FOREIGN KEY (purchase_order_id)
  REFERENCES public.project_purchase_orders(id)
  ON DELETE SET NULL;