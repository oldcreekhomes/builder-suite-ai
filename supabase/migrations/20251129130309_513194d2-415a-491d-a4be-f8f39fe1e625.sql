
-- Clean up corrupted template schedule data
-- Delete all tasks from the template project so user can re-copy fresh from 923 17th
DELETE FROM project_schedule_tasks 
WHERE project_id = 'c839f705-b3ab-4798-85ca-88e107c59deb';
