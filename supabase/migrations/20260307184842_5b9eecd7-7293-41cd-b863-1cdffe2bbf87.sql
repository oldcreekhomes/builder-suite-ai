-- Update PO 2025-923T-0006 total amount from $12,860.01 to $12,860.02
UPDATE project_purchase_orders 
SET total_amount = 12860.02 
WHERE id = '0cc3139e-8901-4ba9-a753-10608b1f980b';

-- Update corresponding PO line item
UPDATE purchase_order_lines 
SET amount = 12860.02, unit_cost = 12860.02 
WHERE id = '2dc65515-3080-43c8-9f6c-43cce1856540';