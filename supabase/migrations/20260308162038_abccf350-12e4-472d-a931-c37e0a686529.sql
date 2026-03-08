-- Data repair: Fix corrupted credit allocations for OCH-02302

-- Fix Jan 27 payment (5eac23ed): credit allocation -500 → -350, total_amount -150 → 0
UPDATE bill_payment_allocations 
SET amount_allocated = -350.00
WHERE bill_payment_id = '5eac23ed-7b82-4a21-8c76-536c5d706d90' 
  AND bill_id = '6b518b88-f4c7-4718-98d2-a77ed1f5a5b5';

UPDATE bill_payments 
SET total_amount = 0.00
WHERE id = '5eac23ed-7b82-4a21-8c76-536c5d706d90';

-- Fix Mar 9 payment (c5b31abb): credit allocation -200 → -150, total_amount 0 → 50
UPDATE bill_payment_allocations 
SET amount_allocated = -150.00
WHERE bill_payment_id = 'c5b31abb-b516-42c3-b0a5-75ccb834729d' 
  AND bill_id = '6b518b88-f4c7-4718-98d2-a77ed1f5a5b5';

UPDATE bill_payments 
SET total_amount = 50.00
WHERE id = 'c5b31abb-b516-42c3-b0a5-75ccb834729d';

-- Fix credit OCH-02302: amount_paid 550 → 500 (max credit is $500)
UPDATE bills 
SET amount_paid = 500
WHERE id = '6b518b88-f4c7-4718-98d2-a77ed1f5a5b5';