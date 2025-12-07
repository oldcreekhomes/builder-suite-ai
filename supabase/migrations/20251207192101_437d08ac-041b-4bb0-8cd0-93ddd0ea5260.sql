-- Assign all unassigned budget items to the first lot of each project
UPDATE project_budgets pb
SET lot_id = (
  SELECT id FROM project_lots pl 
  WHERE pl.project_id = pb.project_id 
  ORDER BY lot_number ASC 
  LIMIT 1
)
WHERE pb.lot_id IS NULL
  AND EXISTS (
    SELECT 1 FROM project_lots pl2 
    WHERE pl2.project_id = pb.project_id
  );