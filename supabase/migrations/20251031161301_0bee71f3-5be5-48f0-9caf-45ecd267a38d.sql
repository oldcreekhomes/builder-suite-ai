-- Merge PEG, LLC into PEG (one-time data operation)

-- Step 1: Update bills to point to PEG instead of PEG, LLC
UPDATE bills 
SET vendor_id = 'c19e3314-4d27-4ca1-a9b9-c7527ecf1249'
WHERE vendor_id = '7587d5fe-69ef-4066-b876-bc0bd7826154';

-- Step 2: Delete duplicate cost code association for PEG, LLC
DELETE FROM company_cost_codes 
WHERE id = '64d5c5cf-c0a7-4c36-88fa-35798a50b6d5';

-- Step 3: Delete PEG, LLC company (now safe to delete)
DELETE FROM companies 
WHERE id = '7587d5fe-69ef-4066-b876-bc0bd7826154';