-- One-time fix: Update all employee-created cost codes to use their home builder's ID
-- This ensures all cost codes within a company share the same owner_id (the home builder's ID)

UPDATE cost_codes cc
SET owner_id = u.home_builder_id
FROM users u
WHERE cc.owner_id = u.id
  AND u.role = 'employee'
  AND u.home_builder_id IS NOT NULL;