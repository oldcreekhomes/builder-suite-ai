-- Delete all associated project files
DELETE FROM public.project_files 
WHERE project_id = '1df7fd43-ebd4-417c-ad46-cbbade74e426';

-- Delete any project schedule tasks
DELETE FROM public.project_schedule_tasks 
WHERE project_id = '1df7fd43-ebd4-417c-ad46-cbbade74e426';

-- Delete any project photos
DELETE FROM public.project_photos 
WHERE project_id = '1df7fd43-ebd4-417c-ad46-cbbade74e426';

-- Delete any project lots
DELETE FROM public.project_lots 
WHERE project_id = '1df7fd43-ebd4-417c-ad46-cbbade74e426';

-- Delete any project budgets
DELETE FROM public.project_budgets 
WHERE project_id = '1df7fd43-ebd4-417c-ad46-cbbade74e426';

-- Delete the project itself
DELETE FROM public.projects 
WHERE id = '1df7fd43-ebd4-417c-ad46-cbbade74e426';