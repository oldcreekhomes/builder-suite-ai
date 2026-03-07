
-- Fix credit OCH-02302 status back to posted (amount_paid=350, total=-500, so $150 credit remaining)
UPDATE bills SET status = 'posted' WHERE id = '6b518b88-f4c7-4718-98d2-a77ed1f5a5b5';

-- Delete bill_payment allocations and record for the reversed payment
DELETE FROM bill_payment_allocations WHERE bill_payment_id = '857bc827-9d68-4634-bb40-174f2542cb56';
DELETE FROM bill_payments WHERE id = '857bc827-9d68-4634-bb40-174f2542cb56';
