-- Fix corrupted July transactions for project 115 E. Oceanwatch
-- These were incorrectly marked reconciled to a reconciliation from a different project (6119 11th Street)
-- This is a one-time data fix

UPDATE checks 
SET reconciled = false, reconciliation_id = null, reconciliation_date = null
WHERE id = '1543f305-f937-4b56-ac93-048558cddffc';

UPDATE deposits 
SET reconciled = false, reconciliation_id = null, reconciliation_date = null
WHERE id = '83776654-43b9-416f-8ee1-94dcc24fec58';