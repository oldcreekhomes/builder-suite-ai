
-- Repair INV0022 (pending_upload_id 205e7614-43b4-4bd1-b950-2ac14d330c2f):
-- 1) Clear stale purchase_order_id values on lines explicitly marked po_assignment='none'.
-- 2) Backfill po_assignment='auto' on any line that has a UUID PO but no explicit assignment.
-- 3) Fix cost codes for lines 2,3 (Exterior Trim) and 4 (Tyvek) per the approved plan.

-- Line 1: keep cost code 4470 Siding, ensure po_assignment='auto' since matched but not user-confirmed
UPDATE public.pending_bill_lines
SET po_assignment = 'auto',
    updated_at = now()
WHERE id = '19672fcb-9a8f-4a83-b0ab-1292cf821700'
  AND po_assignment IS NULL
  AND purchase_order_id IS NOT NULL;

-- Lines 2 & 3: clear stale PO ids and set Exterior Trim cost code
UPDATE public.pending_bill_lines
SET purchase_order_id = NULL,
    purchase_order_line_id = NULL,
    po_assignment = 'none',
    cost_code_id = '7b8891c6-9f68-412b-9040-36b3e053ada8',
    cost_code_name = '4400: Exterior Trim / Cornice',
    updated_at = now()
WHERE id IN ('05ad54f6-5601-4569-9e6e-5f82bef12634', '7e0c1c98-8683-476a-8bf3-9c1028c27bca');

-- Line 4: clear stale PO id and set Tyvek cost code
UPDATE public.pending_bill_lines
SET purchase_order_id = NULL,
    purchase_order_line_id = NULL,
    po_assignment = 'none',
    cost_code_id = '86ac94c9-93eb-49de-a232-c999bb2f8f8a',
    cost_code_name = '4375: Tyvek Installation',
    updated_at = now()
WHERE id = '11dda531-f85c-4110-a747-cf629b6c6cf1';

-- Global backfill: any pending bill line that has a real PO but no po_assignment must be flagged as 'auto'
-- so the new "trust po_assignment" rules behave consistently for older bills.
UPDATE public.pending_bill_lines
SET po_assignment = 'auto'
WHERE purchase_order_id IS NOT NULL
  AND po_assignment IS NULL;
