
-- Fix parent_id format issues for project schedule tasks
-- Convert UUID parent_id values to numeric text values based on task order

UPDATE project_schedule_tasks 
SET parent_id = CASE 
  -- For tasks that currently have UUID parent_ids, convert them to numeric references
  WHEN parent_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
    -- Find the order_index of the parent task and use that as the numeric parent_id
    (SELECT (row_number() OVER (ORDER BY order_index, created_at))::text 
     FROM project_schedule_tasks p2 
     WHERE p2.id::text = project_schedule_tasks.parent_id 
     AND p2.project_id = project_schedule_tasks.project_id)
  ELSE parent_id
END
WHERE project_id IN (
  SELECT id FROM projects WHERE address LIKE '%115 E Oceanwatch%'
);

-- Clean up any invalid assigned_to references
UPDATE project_schedule_tasks 
SET assigned_to = NULL 
WHERE assigned_to IS NOT NULL 
  AND assigned_to NOT IN (
    SELECT id::text FROM users 
    UNION 
    SELECT id::text FROM company_representatives
  )
  AND project_id IN (
    SELECT id FROM projects WHERE address LIKE '%115 E Oceanwatch%'
  );

-- Fix any malformed predecessor values
UPDATE project_schedule_tasks 
SET predecessor = NULL 
WHERE predecessor IS NOT NULL 
  AND predecessor !~ '^[0-9]+(FS|SS|FF|SF)?(,[0-9]+(FS|SS|FF|SF)?)*$'
  AND project_id IN (
    SELECT id FROM projects WHERE address LIKE '%115 E Oceanwatch%'
  );
