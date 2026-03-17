
-- Step 1: Update 2401 total_lots to 6 and address
UPDATE projects SET total_lots = 6, address = '2401-2405 N Potomac Street, Arlington, VA 22207', updated_at = now() 
WHERE id = '350e5951-1a6f-4809-9d4e-7652d58603b9';

-- Step 2: Add lots 4, 5, 6 to 2401
INSERT INTO project_lots (project_id, lot_number, lot_name)
VALUES 
  ('350e5951-1a6f-4809-9d4e-7652d58603b9', 4, 'Lot 4'),
  ('350e5951-1a6f-4809-9d4e-7652d58603b9', 5, 'Lot 5'),
  ('350e5951-1a6f-4809-9d4e-7652d58603b9', 6, 'Lot 6')
ON CONFLICT (project_id, lot_number) DO NOTHING;

-- Step 3: Reassign all 2405 files to 2401
UPDATE project_files SET project_id = '350e5951-1a6f-4809-9d4e-7652d58603b9' 
WHERE project_id = 'b5764167-16d4-4230-823e-e87d1a368b32';

-- Step 4: Create only the 18 unique folders from 2405 in 2401
INSERT INTO project_folders (project_id, folder_path, parent_path, folder_name, created_by)
VALUES
  ('350e5951-1a6f-4809-9d4e-7652d58603b9', 'Entitlements', NULL, 'Entitlements', '071212e3-288b-4e12-9b84-0c1e3a950d34'),
  ('350e5951-1a6f-4809-9d4e-7652d58603b9', 'Entitlements/Utilities', 'Entitlements', 'Utilities', '071212e3-288b-4e12-9b84-0c1e3a950d34'),
  ('350e5951-1a6f-4809-9d4e-7652d58603b9', 'Entitlements/Final Plat', 'Entitlements', 'Final Plat', '071212e3-288b-4e12-9b84-0c1e3a950d34'),
  ('350e5951-1a6f-4809-9d4e-7652d58603b9', 'Entitlements/Preliminary Plat', 'Entitlements', 'Preliminary Plat', '071212e3-288b-4e12-9b84-0c1e3a950d34'),
  ('350e5951-1a6f-4809-9d4e-7652d58603b9', 'Utilities/New Connections', 'Utilities', 'New Connections', '071212e3-288b-4e12-9b84-0c1e3a950d34'),
  ('350e5951-1a6f-4809-9d4e-7652d58603b9', 'Utilities/New Connections/Washington Gas', 'Utilities/New Connections', 'Washington Gas', '071212e3-288b-4e12-9b84-0c1e3a950d34'),
  ('350e5951-1a6f-4809-9d4e-7652d58603b9', 'Utilities/New Connections/Washington Gas/Unit A', 'Utilities/New Connections/Washington Gas', 'Unit A', '071212e3-288b-4e12-9b84-0c1e3a950d34'),
  ('350e5951-1a6f-4809-9d4e-7652d58603b9', 'Utilities/New Connections/Washington Gas/Unit B', 'Utilities/New Connections/Washington Gas', 'Unit B', '071212e3-288b-4e12-9b84-0c1e3a950d34'),
  ('350e5951-1a6f-4809-9d4e-7652d58603b9', 'Utilities/New Connections/Washington Gas/Unit C', 'Utilities/New Connections/Washington Gas', 'Unit C', '071212e3-288b-4e12-9b84-0c1e3a950d34'),
  ('350e5951-1a6f-4809-9d4e-7652d58603b9', 'Utilities/New Connections/Dominion', 'Utilities/New Connections', 'Dominion', '071212e3-288b-4e12-9b84-0c1e3a950d34'),
  ('350e5951-1a6f-4809-9d4e-7652d58603b9', 'Utilities/Utilities', 'Utilities', 'Utilities', '071212e3-288b-4e12-9b84-0c1e3a950d34'),
  ('350e5951-1a6f-4809-9d4e-7652d58603b9', 'Utilities/Utilities/New Permit Applications', 'Utilities/Utilities', 'New Permit Applications', '071212e3-288b-4e12-9b84-0c1e3a950d34'),
  ('350e5951-1a6f-4809-9d4e-7652d58603b9', 'Utilities/Utilities/New Permit Applications/Washington Gas', 'Utilities/Utilities/New Permit Applications', 'Washington Gas', '071212e3-288b-4e12-9b84-0c1e3a950d34'),
  ('350e5951-1a6f-4809-9d4e-7652d58603b9', 'Entitlement/Entitlement', 'Entitlement', 'Entitlement', '1a424219-39e8-46bd-817c-ac475047f564'),
  ('350e5951-1a6f-4809-9d4e-7652d58603b9', 'Entitlement/Entitlement/Preliminary Plat', 'Entitlement/Entitlement', 'Preliminary Plat', '1a424219-39e8-46bd-817c-ac475047f564'),
  ('350e5951-1a6f-4809-9d4e-7652d58603b9', 'Entitlement/Entitlement/Final Plat', 'Entitlement/Entitlement', 'Final Plat', '1a424219-39e8-46bd-817c-ac475047f564'),
  ('350e5951-1a6f-4809-9d4e-7652d58603b9', 'Utilities/New Permit Applications', 'Utilities', 'New Permit Applications', '1a424219-39e8-46bd-817c-ac475047f564'),
  ('350e5951-1a6f-4809-9d4e-7652d58603b9', 'Utilities/New Permit Applications/Washington Gas', 'Utilities/New Permit Applications', 'Washington Gas', '1a424219-39e8-46bd-817c-ac475047f564');

-- Step 5: Reassign all 2405 photos to 2401
UPDATE project_photos SET project_id = '350e5951-1a6f-4809-9d4e-7652d58603b9' 
WHERE project_id = 'b5764167-16d4-4230-823e-e87d1a368b32';

-- Step 6: Reassign 2405's PO to 2401
UPDATE project_purchase_orders SET project_id = '350e5951-1a6f-4809-9d4e-7652d58603b9' 
WHERE project_id = 'b5764167-16d4-4230-823e-e87d1a368b32';

-- Step 7: Delete duplicate bids from 2405
DELETE FROM project_bids WHERE bid_package_id IN (
  SELECT id FROM project_bid_packages WHERE project_id = 'b5764167-16d4-4230-823e-e87d1a368b32'
);

-- Step 8: Delete 2405's bid packages
DELETE FROM project_bid_packages WHERE project_id = 'b5764167-16d4-4230-823e-e87d1a368b32';

-- Step 9: Delete 2405's folders
DELETE FROM project_folders WHERE project_id = 'b5764167-16d4-4230-823e-e87d1a368b32';

-- Step 10: Delete 2405's lots
DELETE FROM project_lots WHERE project_id = 'b5764167-16d4-4230-823e-e87d1a368b32';

-- Step 11: Delete budget data from 2405
DELETE FROM budget_subcategory_selections WHERE project_budget_id IN (
  SELECT id FROM project_budgets WHERE project_id = 'b5764167-16d4-4230-823e-e87d1a368b32'
);
DELETE FROM project_budgets WHERE project_id = 'b5764167-16d4-4230-823e-e87d1a368b32';

-- Step 12: Delete the 2405 project record
DELETE FROM projects WHERE id = 'b5764167-16d4-4230-823e-e87d1a368b32';
