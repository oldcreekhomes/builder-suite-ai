-- Fix the Water & Sewer Disconnect name mismatch
UPDATE project_schedule_tasks
SET hierarchy_number = '1.3'
WHERE project_id = '494d10f1-cbb4-4f64-9ee9-92e755cb088f'
AND task_name = 'Water & Sewer Disconnect PLMB25-02223';

-- Assign Section 9 hierarchies to exterior construction tasks
UPDATE project_schedule_tasks
SET hierarchy_number = '9.1'
WHERE project_id = '494d10f1-cbb4-4f64-9ee9-92e755cb088f'
AND task_name = 'Brick/Stone Masonry';

UPDATE project_schedule_tasks
SET hierarchy_number = '9.2'
WHERE project_id = '494d10f1-cbb4-4f64-9ee9-92e755cb088f'
AND task_name = 'Siding';

UPDATE project_schedule_tasks
SET hierarchy_number = '9.3'
WHERE project_id = '494d10f1-cbb4-4f64-9ee9-92e755cb088f'
AND task_name = 'Exterior Trim';

UPDATE project_schedule_tasks
SET hierarchy_number = '9.4'
WHERE project_id = '494d10f1-cbb4-4f64-9ee9-92e755cb088f'
AND task_name = 'Backfill / Rough Grade';

UPDATE project_schedule_tasks
SET hierarchy_number = '9.5'
WHERE project_id = '494d10f1-cbb4-4f64-9ee9-92e755cb088f'
AND task_name = 'Gutters and Downspouts';

UPDATE project_schedule_tasks
SET hierarchy_number = '9.6'
WHERE project_id = '494d10f1-cbb4-4f64-9ee9-92e755cb088f'
AND task_name = 'Garage Door';

UPDATE project_schedule_tasks
SET hierarchy_number = '9.7'
WHERE project_id = '494d10f1-cbb4-4f64-9ee9-92e755cb088f'
AND task_name = 'Deck';

UPDATE project_schedule_tasks
SET hierarchy_number = '9.8'
WHERE project_id = '494d10f1-cbb4-4f64-9ee9-92e755cb088f'
AND task_name = 'Measure Metal Rails';

UPDATE project_schedule_tasks
SET hierarchy_number = '9.9'
WHERE project_id = '494d10f1-cbb4-4f64-9ee9-92e755cb088f'
AND task_name = 'Final Grade';

UPDATE project_schedule_tasks
SET hierarchy_number = '9.10'
WHERE project_id = '494d10f1-cbb4-4f64-9ee9-92e755cb088f'
AND task_name = 'Apron and Driveway';

UPDATE project_schedule_tasks
SET hierarchy_number = '9.11'
WHERE project_id = '494d10f1-cbb4-4f64-9ee9-92e755cb088f'
AND task_name = 'Install Sewer/ Water';

UPDATE project_schedule_tasks
SET hierarchy_number = '9.12'
WHERE project_id = '494d10f1-cbb4-4f64-9ee9-92e755cb088f'
AND task_name = 'Install Gas';

UPDATE project_schedule_tasks
SET hierarchy_number = '9.13'
WHERE project_id = '494d10f1-cbb4-4f64-9ee9-92e755cb088f'
AND task_name = 'Install Power';

UPDATE project_schedule_tasks
SET hierarchy_number = '9.14'
WHERE project_id = '494d10f1-cbb4-4f64-9ee9-92e755cb088f'
AND task_name = 'Stormwater Management';

UPDATE project_schedule_tasks
SET hierarchy_number = '9.15'
WHERE project_id = '494d10f1-cbb4-4f64-9ee9-92e755cb088f'
AND task_name = 'Fencing';

UPDATE project_schedule_tasks
SET hierarchy_number = '9.16'
WHERE project_id = '494d10f1-cbb4-4f64-9ee9-92e755cb088f'
AND task_name = 'Landscaping and Sod';