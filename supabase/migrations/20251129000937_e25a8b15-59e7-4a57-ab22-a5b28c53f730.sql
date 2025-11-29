-- Update 923 17th Street hierarchies to match TEMPLATE by task name
UPDATE project_schedule_tasks target
SET hierarchy_number = source.hierarchy_number
FROM project_schedule_tasks source
WHERE target.project_id = '494d10f1-cbb4-4f64-9ee9-92e755cb088f'
  AND source.project_id = 'c839f705-b3ab-4798-85ca-88e107c59deb'
  AND target.task_name = source.task_name;