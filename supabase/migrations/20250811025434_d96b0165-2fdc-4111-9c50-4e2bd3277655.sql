-- Add unique constraint to prevent duplicate hierarchy numbers within the same project
ALTER TABLE project_schedule_tasks 
ADD CONSTRAINT unique_hierarchy_per_project 
UNIQUE (project_id, hierarchy_number);