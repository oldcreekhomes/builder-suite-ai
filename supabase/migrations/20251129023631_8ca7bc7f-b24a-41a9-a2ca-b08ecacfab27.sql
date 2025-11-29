
-- Fix all 32 self-referencing predecessors in project 494d10f1-cbb4-4f64-9ee9-92e755cb088f
-- Each predecessor should be the previous task number (e.g., 8.37 → 8.36)

UPDATE project_schedule_tasks
SET predecessor = jsonb_build_array(
  split_part(hierarchy_number, '.', 1) || '.' || 
  (split_part(hierarchy_number, '.', 2)::int - 1)::text
)
WHERE project_id = '494d10f1-cbb4-4f64-9ee9-92e755cb088f'
AND predecessor IS NOT NULL
AND predecessor::text LIKE '%"' || hierarchy_number || '"%'
AND hierarchy_number ~ '^\d+\.\d+$';
