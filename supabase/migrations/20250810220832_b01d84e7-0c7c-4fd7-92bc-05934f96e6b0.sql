-- Add hierarchy_number field to project_schedule_tasks table
ALTER TABLE project_schedule_tasks 
ADD COLUMN hierarchy_number TEXT;