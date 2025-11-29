-- Set all 923 17th Street hierarchy numbers to temporary values
UPDATE project_schedule_tasks
SET hierarchy_number = 'TEMP_' || id::text
WHERE project_id = '494d10f1-cbb4-4f64-9ee9-92e755cb088f';