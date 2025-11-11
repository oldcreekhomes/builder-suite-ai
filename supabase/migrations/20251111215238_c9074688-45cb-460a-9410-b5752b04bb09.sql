-- Sync cost_codes.price from most recent price history for codes where price is NULL
-- This is a one-time data fix for existing cost codes with historical prices

UPDATE cost_codes cc
SET 
  price = (
    SELECT ph.price 
    FROM cost_code_price_history ph
    WHERE ph.cost_code_id = cc.id
    ORDER BY ph.changed_at DESC
    LIMIT 1
  ),
  updated_at = now()
WHERE 
  cc.price IS NULL
  AND EXISTS (
    SELECT 1 
    FROM cost_code_price_history ph2
    WHERE ph2.cost_code_id = cc.id
  );