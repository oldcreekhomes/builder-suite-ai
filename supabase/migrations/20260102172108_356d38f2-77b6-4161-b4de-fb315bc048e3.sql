-- Merge all remaining duplicate companies

-- 1. OCH at N. Potomac, LLC (keep: 13d43775-81a4-4899-b801-735a3d94b27d, delete: 0685b220-8bbc-4f0c-934c-db40b25aa8a3, 1f485cbb-8b40-4525-99b6-599e1071fc1e)
UPDATE bills SET vendor_id = '13d43775-81a4-4899-b801-735a3d94b27d' WHERE vendor_id IN ('0685b220-8bbc-4f0c-934c-db40b25aa8a3', '1f485cbb-8b40-4525-99b6-599e1071fc1e');
UPDATE company_representatives SET company_id = '13d43775-81a4-4899-b801-735a3d94b27d' WHERE company_id IN ('0685b220-8bbc-4f0c-934c-db40b25aa8a3', '1f485cbb-8b40-4525-99b6-599e1071fc1e');
INSERT INTO company_cost_codes (company_id, cost_code_id)
SELECT '13d43775-81a4-4899-b801-735a3d94b27d', cost_code_id FROM company_cost_codes WHERE company_id IN ('0685b220-8bbc-4f0c-934c-db40b25aa8a3', '1f485cbb-8b40-4525-99b6-599e1071fc1e')
AND cost_code_id NOT IN (SELECT cost_code_id FROM company_cost_codes WHERE company_id = '13d43775-81a4-4899-b801-735a3d94b27d');
DELETE FROM company_cost_codes WHERE company_id IN ('0685b220-8bbc-4f0c-934c-db40b25aa8a3', '1f485cbb-8b40-4525-99b6-599e1071fc1e');
DELETE FROM companies WHERE id IN ('0685b220-8bbc-4f0c-934c-db40b25aa8a3', '1f485cbb-8b40-4525-99b6-599e1071fc1e');

-- 2. Derrick Russell (keep: de834764-9237-4921-8655-65687396982a, delete: e29c53de-f312-434d-9d7a-800ff2ae4788)
UPDATE bills SET vendor_id = 'de834764-9237-4921-8655-65687396982a' WHERE vendor_id = 'e29c53de-f312-434d-9d7a-800ff2ae4788';
UPDATE company_representatives SET company_id = 'de834764-9237-4921-8655-65687396982a' WHERE company_id = 'e29c53de-f312-434d-9d7a-800ff2ae4788';
INSERT INTO company_cost_codes (company_id, cost_code_id)
SELECT 'de834764-9237-4921-8655-65687396982a', cost_code_id FROM company_cost_codes WHERE company_id = 'e29c53de-f312-434d-9d7a-800ff2ae4788'
AND cost_code_id NOT IN (SELECT cost_code_id FROM company_cost_codes WHERE company_id = 'de834764-9237-4921-8655-65687396982a');
DELETE FROM company_cost_codes WHERE company_id = 'e29c53de-f312-434d-9d7a-800ff2ae4788';
DELETE FROM companies WHERE id = 'e29c53de-f312-434d-9d7a-800ff2ae4788';

-- 3. Four Seasons Construction (keep: bfd6c51f-5e57-4654-87af-d544417a9fed, delete: d96667c6-28f6-4b84-916f-c018d4e31e3a)
UPDATE bills SET vendor_id = 'bfd6c51f-5e57-4654-87af-d544417a9fed' WHERE vendor_id = 'd96667c6-28f6-4b84-916f-c018d4e31e3a';
UPDATE company_representatives SET company_id = 'bfd6c51f-5e57-4654-87af-d544417a9fed' WHERE company_id = 'd96667c6-28f6-4b84-916f-c018d4e31e3a';
INSERT INTO company_cost_codes (company_id, cost_code_id)
SELECT 'bfd6c51f-5e57-4654-87af-d544417a9fed', cost_code_id FROM company_cost_codes WHERE company_id = 'd96667c6-28f6-4b84-916f-c018d4e31e3a'
AND cost_code_id NOT IN (SELECT cost_code_id FROM company_cost_codes WHERE company_id = 'bfd6c51f-5e57-4654-87af-d544417a9fed');
DELETE FROM company_cost_codes WHERE company_id = 'd96667c6-28f6-4b84-916f-c018d4e31e3a';
DELETE FROM companies WHERE id = 'd96667c6-28f6-4b84-916f-c018d4e31e3a';

-- 4. Rimble Landscaping (keep: 0f3c0738-b142-48e6-8e57-4980e809a865, delete: 476cbbae-b23e-4721-be57-92cd9bf4c75f)
UPDATE bills SET vendor_id = '0f3c0738-b142-48e6-8e57-4980e809a865' WHERE vendor_id = '476cbbae-b23e-4721-be57-92cd9bf4c75f';
UPDATE company_representatives SET company_id = '0f3c0738-b142-48e6-8e57-4980e809a865' WHERE company_id = '476cbbae-b23e-4721-be57-92cd9bf4c75f';
INSERT INTO company_cost_codes (company_id, cost_code_id)
SELECT '0f3c0738-b142-48e6-8e57-4980e809a865', cost_code_id FROM company_cost_codes WHERE company_id = '476cbbae-b23e-4721-be57-92cd9bf4c75f'
AND cost_code_id NOT IN (SELECT cost_code_id FROM company_cost_codes WHERE company_id = '0f3c0738-b142-48e6-8e57-4980e809a865');
DELETE FROM company_cost_codes WHERE company_id = '476cbbae-b23e-4721-be57-92cd9bf4c75f';
DELETE FROM companies WHERE id = '476cbbae-b23e-4721-be57-92cd9bf4c75f';

-- 5. The Law Offices of Mark S. Allen (keep: e7d9631f-04f4-4155-8b37-a5c384dc1019, delete: ed128213-0e59-4be3-8ac8-0a7b48ac2806)
UPDATE bills SET vendor_id = 'e7d9631f-04f4-4155-8b37-a5c384dc1019' WHERE vendor_id = 'ed128213-0e59-4be3-8ac8-0a7b48ac2806';
UPDATE company_representatives SET company_id = 'e7d9631f-04f4-4155-8b37-a5c384dc1019' WHERE company_id = 'ed128213-0e59-4be3-8ac8-0a7b48ac2806';
INSERT INTO company_cost_codes (company_id, cost_code_id)
SELECT 'e7d9631f-04f4-4155-8b37-a5c384dc1019', cost_code_id FROM company_cost_codes WHERE company_id = 'ed128213-0e59-4be3-8ac8-0a7b48ac2806'
AND cost_code_id NOT IN (SELECT cost_code_id FROM company_cost_codes WHERE company_id = 'e7d9631f-04f4-4155-8b37-a5c384dc1019');
DELETE FROM company_cost_codes WHERE company_id = 'ed128213-0e59-4be3-8ac8-0a7b48ac2806';
DELETE FROM companies WHERE id = 'ed128213-0e59-4be3-8ac8-0a7b48ac2806';

-- Create unique constraint to prevent future duplicates
CREATE UNIQUE INDEX companies_unique_name_per_builder 
ON companies (home_builder_id, LOWER(TRIM(company_name)));