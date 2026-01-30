-- Merge PEG LLC into PEG
-- Step 1: Update bills to reference PEG instead of PEG LLC
UPDATE bills 
SET vendor_id = 'c19e3314-4d27-4ca1-a9b9-c7527ecf1249'
WHERE vendor_id = '16591c5b-05b6-4213-95bd-24cfe77ad85b';

-- Step 2: Delete duplicate company_cost_codes entry for PEG LLC
DELETE FROM company_cost_codes 
WHERE company_id = '16591c5b-05b6-4213-95bd-24cfe77ad85b';

-- Step 3: Delete the PEG LLC company record
DELETE FROM companies 
WHERE id = '16591c5b-05b6-4213-95bd-24cfe77ad85b';