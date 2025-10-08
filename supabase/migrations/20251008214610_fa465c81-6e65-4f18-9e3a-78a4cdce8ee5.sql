-- Fix corrupt PEG bill line amount
UPDATE pending_bill_lines
SET 
  amount = 500.00,
  unit_cost = 500.00,
  updated_at = now()
WHERE id = 'b406bea4-12a0-4300-8472-a6ce811d4571';