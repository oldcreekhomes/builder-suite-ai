-- Fix hierarchy numbering for Construction tasks
-- Update all tasks that have hierarchy_number '3.1' to be sequential under parent '2'

-- First, create a temporary table with the correct hierarchy numbers
WITH construction_tasks AS (
  SELECT 
    id,
    '2.' || ROW_NUMBER() OVER (ORDER BY task_name) as new_hierarchy_number
  FROM project_schedule_tasks 
  WHERE project_id = '494d10f1-cbb4-4f64-9ee9-92e755cb088f' 
    AND hierarchy_number = '3.1'
)
UPDATE project_schedule_tasks 
SET hierarchy_number = construction_tasks.new_hierarchy_number
FROM construction_tasks
WHERE project_schedule_tasks.id = construction_tasks.id;