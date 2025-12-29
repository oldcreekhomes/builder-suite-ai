-- Fix: Insert estimate-enabled cost codes to the CORRECT takeoff project
-- Using item_type = 'count' (the valid value)

INSERT INTO takeoff_items (
  takeoff_sheet_id,
  cost_code_id,
  category,
  item_type,
  quantity,
  unit_of_measure,
  unit_price,
  color,
  owner_id
)
SELECT 
  s.id as takeoff_sheet_id,
  cc.id as cost_code_id,
  cc.name as category,
  'count' as item_type,
  0 as quantity,
  cc.unit_of_measure,
  cc.price as unit_price,
  CASE 
    WHEN cc.name = 'Windows - Single' THEN '#ef4444'
    WHEN cc.name = 'Windows - Double' THEN '#f97316'
    WHEN cc.name = 'Windows - Triple' THEN '#eab308'
    WHEN cc.name = 'Gutters & Downspouts' THEN '#22c55e'
    WHEN cc.name = 'Lap' THEN '#14b8a6'
    WHEN cc.name = 'Board & Batten' THEN '#3b82f6'
    WHEN cc.name = 'Garage Door - Single' THEN '#8b5cf6'
    WHEN cc.name = 'Garage Door - Double' THEN '#ec4899'
    ELSE '#6b7280'
  END as color,
  '2653aba8-d154-4301-99bf-77d559492e19' as owner_id
FROM takeoff_sheets s
CROSS JOIN cost_codes cc
WHERE s.takeoff_project_id = '97b39bbe-66dc-469e-8e47-996b1a9cc77d'
  AND cc.estimate = true
  AND cc.owner_id = '2653aba8-d154-4301-99bf-77d559492e19'
  AND NOT EXISTS (
    SELECT 1 FROM takeoff_items ti 
    WHERE ti.takeoff_sheet_id = s.id 
    AND ti.cost_code_id = cc.id
  );