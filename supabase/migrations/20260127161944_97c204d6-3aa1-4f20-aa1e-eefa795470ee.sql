-- Step 1: Transfer deposits from "Anchor Loans" to "Anchor Loans LP"
UPDATE deposits 
SET company_id = '54397ed8-f88f-4a74-bb36-51e03a3b436e'
WHERE company_id = '31b1fa0b-0b89-4b17-a5e4-4a031b9c27e6';

-- Step 2: Delete the now-empty "Anchor Loans" company
DELETE FROM companies 
WHERE id = '31b1fa0b-0b89-4b17-a5e4-4a031b9c27e6';

-- Step 3: Rename "Anchor Loans LP" to "Anchor Loans"
UPDATE companies 
SET company_name = 'Anchor Loans'
WHERE id = '54397ed8-f88f-4a74-bb36-51e03a3b436e';