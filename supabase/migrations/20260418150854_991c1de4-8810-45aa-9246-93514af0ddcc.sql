ALTER TABLE public.pending_bill_lines ADD COLUMN IF NOT EXISTS po_reference text;
ALTER TABLE public.bill_lines ADD COLUMN IF NOT EXISTS po_reference text;