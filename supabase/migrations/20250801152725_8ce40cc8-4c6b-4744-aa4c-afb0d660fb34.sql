-- Clean up duplicate "New Task" entries from the Oceanwatch Court project
DELETE FROM project_schedule_tasks 
WHERE project_id = 'f13eae11-ab55-4034-b70c-734fc3afe340' 
AND task_name = 'New Task' 
AND id IN (
  '9c4b3a8d-6ce3-4b45-b224-a3fd723bd54f',
  '2155d105-8cab-4745-acba-b9d2cfa6c63a',
  '92d76548-c8f4-4d74-bbec-97cc30fbc916',
  'fafb86bb-2825-4450-bf50-adbc77ba3460',
  '243e775c-05ef-444c-a092-23bc845b30ea',
  '25c3a3f4-0156-484b-9400-60674ffa1e5b',
  'c89b3e7d-0a79-4767-bdc5-4fd0bb1b34c8',
  '1d744908-c7f4-4f3e-8e3e-203340b7cd0a',
  'b0b6d76e-9a9f-4949-b5d2-5c4a4b506e72'
);