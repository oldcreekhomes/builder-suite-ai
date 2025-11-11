-- Delete the erroneous $0 history entry
DELETE FROM cost_code_price_history
WHERE id = 'bcdb1281-43b1-4984-9675-1d17265b7050';

-- Restore the correct price for EHO Plat cost code
UPDATE cost_codes
SET price = 4000, updated_at = NOW()
WHERE id = 'ee996ab1-734d-4d14-95ae-cdeca89b9a43';