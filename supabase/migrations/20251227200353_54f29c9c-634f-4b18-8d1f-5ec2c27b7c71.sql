-- Permanently close 5 completed projects
-- This only updates the status field; all historical data remains intact

UPDATE projects 
SET status = 'Permanently Closed',
    updated_at = now()
WHERE id IN (
  'f8853445-04b4-4af0-90b7-5ab50f0c4f8d',  -- 1115 Prince Street
  '7c9a0255-77b0-4c1f-82ea-62c87d96d0a6',  -- 201-207 Duncan Ave
  '6203db09-2cd7-4ca9-9f1a-4b875e3ec04f',  -- 4 Potomac Court
  'b633e88d-5050-4683-b816-64bbf6712ecb',  -- 1712 N. Quebec St
  '4077ef46-825f-42fe-b8de-6b2c9b1dc3fa'   -- 1917 Utah St
);