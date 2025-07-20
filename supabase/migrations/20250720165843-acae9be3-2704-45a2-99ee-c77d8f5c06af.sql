
-- Fix the order_index values to be properly sequential
-- This ensures stable, predictable ordering for all tasks
UPDATE project_schedule_tasks 
SET order_index = subquery.row_number - 1
FROM (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY project_id ORDER BY created_at, id) as row_number
  FROM project_schedule_tasks
) AS subquery
WHERE project_schedule_tasks.id = subquery.id;

-- Ensure the order_index is properly indexed for performance
CREATE INDEX IF NOT EXISTS idx_project_schedule_tasks_order_index ON public.project_schedule_tasks(project_id, order_index);
