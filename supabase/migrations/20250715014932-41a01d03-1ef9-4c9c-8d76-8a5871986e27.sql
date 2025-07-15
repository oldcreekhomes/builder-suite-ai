-- Clean up unnecessary columns in projects table
-- Remove manager_id and manager_name since we now use the manager column

-- First, drop the foreign key constraints
ALTER TABLE public.projects DROP CONSTRAINT IF EXISTS fk_projects_manager;
ALTER TABLE public.projects DROP CONSTRAINT IF EXISTS fk_projects_manager_user;

-- Drop the unnecessary columns
ALTER TABLE public.projects DROP COLUMN IF EXISTS manager_id;
ALTER TABLE public.projects DROP COLUMN IF EXISTS manager_name;

-- Ensure the manager column has the correct foreign key constraint
ALTER TABLE public.projects ADD CONSTRAINT fk_projects_manager_user 
FOREIGN KEY (manager) REFERENCES public.users(id);