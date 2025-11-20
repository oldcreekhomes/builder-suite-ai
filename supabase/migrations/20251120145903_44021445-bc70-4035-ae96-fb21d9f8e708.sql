-- Assign all NULL lot_id budget items to the first lot of each project
-- This ensures existing budget data is properly scoped to Lot 1

UPDATE project_budgets
SET lot_id = (
  SELECT id 
  FROM project_lots 
  WHERE project_lots.project_id = project_budgets.project_id 
    AND project_lots.lot_number = 1
  LIMIT 1
)
WHERE lot_id IS NULL
  AND EXISTS (
    SELECT 1 
    FROM project_lots 
    WHERE project_lots.project_id = project_budgets.project_id
  );