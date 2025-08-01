-- Delete the remaining "New Task" entries that are interfering with the Gantt chart display
DELETE FROM project_schedule_tasks 
WHERE project_id = 'f13eae11-ab55-4034-b70c-734fc3afe340' 
AND task_name = 'New Task' 
AND id IN (
  '7a44c458-c058-4ca1-9928-45d892bbdd47',
  '7a63d15f-810c-4221-940f-8b279756c0c8',
  'ca297895-ad8f-41c1-b798-565f41325d41',
  'cc522bc2-cc61-4064-bed9-d43c4789a1f8'
);