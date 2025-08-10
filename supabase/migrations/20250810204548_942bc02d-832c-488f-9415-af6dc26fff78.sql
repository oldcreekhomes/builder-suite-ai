-- Add hierarchy_number column to project_schedule_tasks
ALTER TABLE public.project_schedule_tasks 
ADD COLUMN hierarchy_number TEXT;

-- Create function to generate hierarchical numbers from existing data
CREATE OR REPLACE FUNCTION populate_hierarchy_numbers()
RETURNS void
LANGUAGE plpgsql
AS $function$
DECLARE
    project_rec RECORD;
    task_rec RECORD;
    counter INTEGER;
    parent_hierarchy TEXT;
    child_counter INTEGER;
BEGIN
    -- Process each project separately
    FOR project_rec IN SELECT DISTINCT project_id FROM public.project_schedule_tasks LOOP
        counter := 1;
        
        -- First, handle root level tasks (no parent_id)
        FOR task_rec IN 
            SELECT id, order_index
            FROM public.project_schedule_tasks 
            WHERE project_id = project_rec.project_id 
              AND (parent_id IS NULL OR parent_id = '')
            ORDER BY order_index ASC, created_at ASC
        LOOP
            UPDATE public.project_schedule_tasks 
            SET hierarchy_number = counter::TEXT
            WHERE id = task_rec.id;
            
            counter := counter + 1;
        END LOOP;
        
        -- Then handle child tasks recursively
        FOR task_rec IN 
            SELECT id, parent_id, order_index
            FROM public.project_schedule_tasks 
            WHERE project_id = project_rec.project_id 
              AND parent_id IS NOT NULL 
              AND parent_id != ''
            ORDER BY order_index ASC, created_at ASC
        LOOP
            -- Find parent's hierarchy number
            SELECT hierarchy_number INTO parent_hierarchy
            FROM public.project_schedule_tasks 
            WHERE id::TEXT = task_rec.parent_id;
            
            IF parent_hierarchy IS NOT NULL THEN
                -- Find the next child number for this parent
                SELECT COALESCE(MAX(
                    CASE 
                        WHEN hierarchy_number ~ ('^' || parent_hierarchy || '\.[0-9]+$') 
                        THEN CAST(SPLIT_PART(hierarchy_number, '.', -1) AS INTEGER)
                        ELSE 0 
                    END
                ), 0) + 1 
                INTO child_counter
                FROM public.project_schedule_tasks 
                WHERE project_id = project_rec.project_id;
                
                UPDATE public.project_schedule_tasks 
                SET hierarchy_number = parent_hierarchy || '.' || child_counter::TEXT
                WHERE id = task_rec.id;
            END IF;
        END LOOP;
    END LOOP;
END;
$function$;

-- Execute the function to populate hierarchy numbers
SELECT populate_hierarchy_numbers();

-- Drop the temporary function
DROP FUNCTION populate_hierarchy_numbers();

-- Make hierarchy_number NOT NULL after population
ALTER TABLE public.project_schedule_tasks 
ALTER COLUMN hierarchy_number SET NOT NULL;

-- Add index for performance
CREATE INDEX idx_project_schedule_tasks_hierarchy_number 
ON public.project_schedule_tasks(project_id, hierarchy_number);