-- Populate hierarchy_number based on existing parent_id and order_index relationships
WITH RECURSIVE task_hierarchy AS (
  -- Base case: root tasks (no parent_id)
  SELECT 
    id,
    project_id,
    parent_id,
    order_index,
    task_name,
    ROW_NUMBER() OVER (PARTITION BY project_id ORDER BY order_index, created_at) AS hierarchy_number_int,
    ROW_NUMBER() OVER (PARTITION BY project_id ORDER BY order_index, created_at)::text AS hierarchy_number,
    1 AS level
  FROM project_schedule_tasks 
  WHERE parent_id IS NULL OR parent_id = ''
  
  UNION ALL
  
  -- Recursive case: child tasks
  SELECT 
    t.id,
    t.project_id,
    t.parent_id,
    t.order_index,
    t.task_name,
    ROW_NUMBER() OVER (PARTITION BY t.parent_id ORDER BY t.order_index, t.created_at) AS hierarchy_number_int,
    h.hierarchy_number || '.' || ROW_NUMBER() OVER (PARTITION BY t.parent_id ORDER BY t.order_index, t.created_at)::text AS hierarchy_number,
    h.level + 1 AS level
  FROM project_schedule_tasks t
  INNER JOIN task_hierarchy h ON t.parent_id = h.id
  WHERE t.parent_id IS NOT NULL AND t.parent_id != ''
)
UPDATE project_schedule_tasks 
SET hierarchy_number = task_hierarchy.hierarchy_number
FROM task_hierarchy 
WHERE project_schedule_tasks.id = task_hierarchy.id;