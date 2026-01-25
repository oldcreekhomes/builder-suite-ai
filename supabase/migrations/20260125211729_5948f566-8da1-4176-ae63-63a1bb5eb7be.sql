-- Step 1: Delete company representatives associated with archived test companies
DELETE FROM company_representatives 
WHERE company_id IN (
  '0c6d57d4-91fa-46b5-b9e4-755ca2494cfa',  -- A New FAke Company
  'e3564ce4-6136-41ca-9bd6-ea6df8c83347'   -- A Test Company
);

-- Step 2: Delete the archived test companies
DELETE FROM companies 
WHERE id IN (
  '0c6d57d4-91fa-46b5-b9e4-755ca2494cfa',  -- A New FAke Company
  'e3564ce4-6136-41ca-9bd6-ea6df8c83347'   -- A Test Company
);