-- Update all draft and pending POs to approved status (pre-approved workflow)
UPDATE project_purchase_orders 
SET status = 'approved', updated_at = NOW() 
WHERE status IN ('draft', 'pending');