-- Add hierarchy_number column to project_schedule_tasks (if not exists)
DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'project_schedule_tasks' 
        AND column_name = 'hierarchy_number'
    ) THEN
        ALTER TABLE public.project_schedule_tasks ADD COLUMN hierarchy_number TEXT;
    END IF;
END $$;

-- Create improved function to generate hierarchical numbers
CREATE OR REPLACE FUNCTION populate_hierarchy_numbers_v2()
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
    FOR project_rec IN SELECT DISTINCT project_id FROM public.project_schedule_tasks WHERE hierarchy_number IS NULL LOOP
        counter := 1;
        
        -- First, handle root level tasks (no parent_id or empty parent_id)
        FOR task_rec IN 
            SELECT id, order_index, created_at
            FROM public.project_schedule_tasks 
            WHERE project_id = project_rec.project_id 
              AND (parent_id IS NULL OR parent_id = '' OR parent_id = '0')
              AND hierarchy_number IS NULL
            ORDER BY COALESCE(order_index, 999999) ASC, created_at ASC
        LOOP
            UPDATE public.project_schedule_tasks 
            SET hierarchy_number = counter::TEXT
            WHERE id = task_rec.id;
            
            counter := counter + 1;
        END LOOP;
        
        -- Handle child tasks - need to do this iteratively to handle nested children
        LOOP
            -- Find tasks that have a parent with hierarchy_number but don't have hierarchy_number themselves
            UPDATE public.project_schedule_tasks child
            SET hierarchy_number = (
                SELECT parent.hierarchy_number || '.' || (
                    -- Find next available child number
                    SELECT COALESCE(MAX(
                        CASE 
                            WHEN sibling.hierarchy_number ~ ('^' || parent.hierarchy_number || '\.[0-9]+$') 
                            THEN CAST(SPLIT_PART(sibling.hierarchy_number, '.', -1) AS INTEGER)
                            ELSE 0 
                        END
                    ), 0) + 1
                    FROM public.project_schedule_tasks sibling
                    WHERE sibling.project_id = child.project_id
                )::TEXT
                FROM public.project_schedule_tasks parent
                WHERE parent.id::TEXT = child.parent_id
                  AND parent.hierarchy_number IS NOT NULL
            )
            WHERE child.project_id = project_rec.project_id
              AND child.hierarchy_number IS NULL
              AND child.parent_id IS NOT NULL 
              AND child.parent_id != ''
              AND child.parent_id != '0'
              AND EXISTS (
                  SELECT 1 FROM public.project_schedule_tasks parent
                  WHERE parent.id::TEXT = child.parent_id
                    AND parent.hierarchy_number IS NOT NULL
              );
            
            -- Exit when no more updates were made
            EXIT WHEN NOT FOUND;
        END LOOP;
        
        -- Handle any remaining tasks without hierarchy numbers (fallback)
        FOR task_rec IN 
            SELECT id
            FROM public.project_schedule_tasks 
            WHERE project_id = project_rec.project_id 
              AND hierarchy_number IS NULL
        LOOP
            UPDATE public.project_schedule_tasks 
            SET hierarchy_number = (counter + 1000)::TEXT  -- Use high numbers to avoid conflicts
            WHERE id = task_rec.id;
            
            counter := counter + 1;
        END LOOP;
    END LOOP;
END;
$function$;

-- Execute the improved function
SELECT populate_hierarchy_numbers_v2();

-- Drop the function
DROP FUNCTION populate_hierarchy_numbers_v2();

-- Now make hierarchy_number NOT NULL
ALTER TABLE public.project_schedule_tasks 
ALTER COLUMN hierarchy_number SET NOT NULL;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_project_schedule_tasks_hierarchy_number 
ON public.project_schedule_tasks(project_id, hierarchy_number);