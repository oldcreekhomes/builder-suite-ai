-- Step 1: Update parent cost codes to have estimate=false so they don't auto-create as items
UPDATE cost_codes 
SET estimate = false 
WHERE has_subcategories = true
AND estimate = true;

-- Step 2: Delete incorrectly created takeoff items for parent cost codes
DELETE FROM takeoff_items 
WHERE cost_code_id IN (
  SELECT id FROM cost_codes 
  WHERE has_subcategories = true
);