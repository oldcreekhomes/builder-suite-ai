ALTER TABLE public.pending_bill_lines ADD COLUMN IF NOT EXISTS po_assignment text;
ALTER TABLE public.bill_lines ADD COLUMN IF NOT EXISTS po_assignment text;
ALTER TABLE public.pending_bill_lines DROP CONSTRAINT IF EXISTS pending_bill_lines_po_assignment_check;
ALTER TABLE public.pending_bill_lines ADD CONSTRAINT pending_bill_lines_po_assignment_check CHECK (po_assignment IS NULL OR po_assignment IN ('none','auto'));
ALTER TABLE public.bill_lines DROP CONSTRAINT IF EXISTS bill_lines_po_assignment_check;
ALTER TABLE public.bill_lines ADD CONSTRAINT bill_lines_po_assignment_check CHECK (po_assignment IS NULL OR po_assignment IN ('none','auto'));