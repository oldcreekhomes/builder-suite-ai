-- Restore 923 17th Street schedule from CORRECT TEMPLATE
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
WHERE project_id = 'c839f705-b3ab-4798-85ca-88e107c59deb'
ORDER BY hierarchy_number;