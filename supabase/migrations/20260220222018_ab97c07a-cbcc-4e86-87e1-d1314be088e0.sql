
-- Clear stale Framing Labor PO assignment from INV0022 Exterior Trim lines
-- These lines had purchase_order_id written by the original auto-match but
-- the user explicitly chose "No purchase order" — the sanitizePoId bug
-- (returning undefined instead of null) prevented the clear from persisting.
UPDATE bill_lines
SET purchase_order_id = NULL,
    purchase_order_line_id = NULL
WHERE id IN (
  'aab164cf-a400-4c2b-ab68-5f8aac695a0f',
  '2ad7293e-8b20-406c-a26c-a0a7a047eec5'
);
