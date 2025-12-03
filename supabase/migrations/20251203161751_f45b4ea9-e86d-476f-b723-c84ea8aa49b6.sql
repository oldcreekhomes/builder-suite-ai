
-- Fix all self-referencing predecessors for project 923 17th Street
-- Each task will point to the previous hierarchy number in the chain
-- predecessor is JSONB array type

UPDATE project_schedule_tasks
SET predecessor = to_jsonb(ARRAY[CONCAT('9.', (SPLIT_PART(hierarchy_number, '.', 2)::int - 1)::text)])
WHERE project_id = '494d10f1-cbb4-4f64-9ee9-92e755cb088f'
  AND hierarchy_number LIKE '9.%'
  AND predecessor IS NOT NULL
  AND predecessor::text LIKE '%' || hierarchy_number || '%'
  AND SPLIT_PART(hierarchy_number, '.', 2)::int >= 9;
