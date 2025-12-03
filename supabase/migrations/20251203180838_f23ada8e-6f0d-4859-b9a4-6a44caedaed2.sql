-- Fix all self-referencing predecessors in 923 17th Street project (re-run after delete caused new ones)
UPDATE project_schedule_tasks
SET predecessor = jsonb_build_array(
  split_part(hierarchy_number, '.', 1) || '.' || 
  (split_part(hierarchy_number, '.', 2)::int - 1)::text
),
updated_at = now()
WHERE project_id = '494d10f1-cbb4-4f64-9ee9-92e755cb088f'
  AND hierarchy_number LIKE '_.%'
  AND split_part(hierarchy_number, '.', 2)::int >= 5
  AND predecessor IS NOT NULL
  AND predecessor::text LIKE '%"' || hierarchy_number || '"%';