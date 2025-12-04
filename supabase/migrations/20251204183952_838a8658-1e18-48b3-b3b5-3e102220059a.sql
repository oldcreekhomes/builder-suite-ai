-- Restore 923 17th Street schedule from TEMPLATE
-- Step 1: Delete all existing tasks in 923 17th Street
DELETE FROM project_schedule_tasks 
WHERE project_id = '494d10f1-cbb4-4f64-9ee9-92e755cb088f';

-- Step 2: Copy all tasks from TEMPLATE with adjusted dates
-- TEMPLATE project ID: 63b11d38-0e50-49eb-9f54-c97425f86795
-- Target project ID: 494d10f1-cbb4-4f64-9ee9-92e755cb088f
INSERT INTO project_schedule_tasks (
  project_id,
  task_name,
  start_date,
  end_date,
  duration,
  progress,
  predecessor,
  resources,
  hierarchy_number,
  notes,
  confirmed
)
SELECT 
  '494d10f1-cbb4-4f64-9ee9-92e755cb088f'::uuid as project_id,
  task_name,
  start_date,
  end_date,
  duration,
  progress,
  predecessor,
  resources,
  hierarchy_number,
  notes,
  confirmed
FROM project_schedule_tasks
WHERE project_id = '63b11d38-0e50-49eb-9f54-c97425f86795'
ORDER BY hierarchy_number;