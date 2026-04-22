-- 1) Repair INV0022 lines 2 and 3 (pending_upload_id = 72304b79-...) to "No PO"
UPDATE public.pending_bill_lines
SET purchase_order_id = NULL,
    purchase_order_line_id = NULL,
    po_assignment = 'none'
WHERE pending_upload_id = '72304b79-9c0c-4cf0-83a3-b80a8a6b0c8c'
  AND line_number IN (2, 3);

-- Fallback in case the upload id differs slightly: match by INV0022 reference if needed
UPDATE public.pending_bill_lines pbl
SET purchase_order_id = NULL,
    purchase_order_line_id = NULL,
    po_assignment = 'none'
FROM public.pending_bill_uploads pbu
WHERE pbl.pending_upload_id = pbu.id
  AND pbu.extracted_data->>'invoice_number' = 'INV0022'
  AND pbl.line_number IN (2, 3)
  AND pbl.po_assignment IS DISTINCT FROM 'none';

-- 2) Backfill po_assignment = 'auto' for any rows that have a PO but no explicit assignment
UPDATE public.pending_bill_lines
SET po_assignment = 'auto'
WHERE purchase_order_id IS NOT NULL
  AND po_assignment IS NULL;

UPDATE public.bill_lines
SET po_assignment = 'auto'
WHERE purchase_order_id IS NOT NULL
  AND po_assignment IS NULL;