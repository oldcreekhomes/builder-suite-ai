-- First, let's see what data is currently in the manager field
-- We'll need to handle existing data carefully

-- Step 1: Add a new column for the manager UUID
ALTER TABLE public.projects ADD COLUMN manager_id uuid;

-- Step 2: Add foreign key constraint
ALTER TABLE public.projects ADD CONSTRAINT fk_projects_manager 
FOREIGN KEY (manager_id) REFERENCES public.users(id);

-- Step 3: For now, keep the old manager column as manager_name for backward compatibility
-- We'll remove it later once everything is updated
ALTER TABLE public.projects RENAME COLUMN manager TO manager_name;

-- Step 4: Add the new manager column (this will be the UUID reference)
ALTER TABLE public.projects ADD COLUMN manager uuid;

-- Step 5: Add foreign key constraint for the new manager column
ALTER TABLE public.projects ADD CONSTRAINT fk_projects_manager_user 
FOREIGN KEY (manager) REFERENCES public.users(id);

-- Note: Existing projects will have NULL manager until they're updated to reference actual users