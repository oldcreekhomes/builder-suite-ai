-- One-time data fix: allocate INV0010 bill line to "2nd floor" PO line
UPDATE bill_lines
SET purchase_order_line_id = '202c5f27-2c15-48f5-924f-9e1da3934414'
WHERE id = '3683d0d0-b56f-425e-ba4c-c3ff60bb5d41';