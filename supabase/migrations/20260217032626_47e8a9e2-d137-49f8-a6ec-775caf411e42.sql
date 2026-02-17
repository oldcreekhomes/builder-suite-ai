
-- Step 1: NULL out ALL purchase_order_id on bill_lines (reverse the bad backfill)
UPDATE bill_lines SET purchase_order_id = NULL WHERE purchase_order_id IS NOT NULL;

-- Step 2: Re-apply correctly using subquery approach
UPDATE bill_lines bl
SET purchase_order_id = sub.po_id
FROM (
  SELECT bl2.id AS bill_line_id, pbl.purchase_order_id AS po_id
  FROM bill_lines bl2
  JOIN bills b ON b.id = bl2.bill_id
  JOIN bill_attachments ba ON ba.bill_id = b.id
  JOIN pending_bill_uploads pbu ON pbu.file_path = ba.file_path AND pbu.owner_id = b.owner_id
  JOIN pending_bill_lines pbl ON pbl.pending_upload_id = pbu.id
  WHERE pbu.status = 'approved'
    AND pbl.purchase_order_id IS NOT NULL
    AND bl2.line_number = pbl.line_number
    AND bl2.owner_id = pbl.owner_id
) sub
WHERE bl.id = sub.bill_line_id;
