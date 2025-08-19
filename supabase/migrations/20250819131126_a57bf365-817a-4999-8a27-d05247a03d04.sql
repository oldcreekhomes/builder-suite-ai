-- Move all data from "Waterloo Farm Rd" (Under Construction) to "7659 Waterloo" (In Design)
-- From project ID: 1d5f7f4a-1249-4a25-a23c-f6ab389a53f6 (Under Construction)
-- To project ID: e657fb3b-709c-47ec-8f7b-d7c9446ebd9c (In Design)

-- Update project_budgets
UPDATE project_budgets 
SET project_id = 'e657fb3b-709c-47ec-8f7b-d7c9446ebd9c'
WHERE project_id = '1d5f7f4a-1249-4a25-a23c-f6ab389a53f6';

-- Update project_photos  
UPDATE project_photos 
SET project_id = 'e657fb3b-709c-47ec-8f7b-d7c9446ebd9c'
WHERE project_id = '1d5f7f4a-1249-4a25-a23c-f6ab389a53f6';

-- Update project_files
UPDATE project_files 
SET project_id = 'e657fb3b-709c-47ec-8f7b-d7c9446ebd9c'
WHERE project_id = '1d5f7f4a-1249-4a25-a23c-f6ab389a53f6';

-- Update project_bid_packages
UPDATE project_bid_packages 
SET project_id = 'e657fb3b-709c-47ec-8f7b-d7c9446ebd9c'
WHERE project_id = '1d5f7f4a-1249-4a25-a23c-f6ab389a53f6';

-- Update project_folders
UPDATE project_folders 
SET project_id = 'e657fb3b-709c-47ec-8f7b-d7c9446ebd9c'
WHERE project_id = '1d5f7f4a-1249-4a25-a23c-f6ab389a53f6';

-- Update project_schedule_tasks
UPDATE project_schedule_tasks 
SET project_id = 'e657fb3b-709c-47ec-8f7b-d7c9446ebd9c'
WHERE project_id = '1d5f7f4a-1249-4a25-a23c-f6ab389a53f6';