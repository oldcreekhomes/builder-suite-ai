-- Step 1: Clean up duplicate hierarchy numbers within each project
-- This will reassign unique sequential hierarchy numbers while preserving parent-child relationships

-- Create a temporary function to reassign hierarchy numbers
CREATE OR REPLACE FUNCTION reassign_hierarchy_numbers()
RETURNS void AS $$
DECLARE
    project_record RECORD;
    task_record RECORD;
    new_hierarchy_counter INTEGER;
BEGIN
    -- Process each project separately
    FOR project_record IN 
        SELECT DISTINCT project_id FROM project_schedule_tasks
    LOOP
        new_hierarchy_counter := 1;
        
        -- Get all tasks for this project, ordered by current hierarchy_number (as text), then by created_at
        -- This preserves the existing order as much as possible
        FOR task_record IN
            SELECT id, hierarchy_number, parent_id
            FROM project_schedule_tasks 
            WHERE project_id = project_record.project_id
            ORDER BY 
                LENGTH(hierarchy_number), -- Sort by length first (so "1" comes before "10")
                hierarchy_number,         -- Then alphabetically
                created_at               -- Finally by creation time for stability
        LOOP
            -- Update the task with new sequential hierarchy number
            UPDATE project_schedule_tasks 
            SET hierarchy_number = new_hierarchy_counter::text,
                updated_at = NOW()
            WHERE id = task_record.id;
            
            new_hierarchy_counter := new_hierarchy_counter + 1;
        END LOOP;
        
        RAISE NOTICE 'Reassigned hierarchy numbers for project %', project_record.project_id;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Execute the cleanup
SELECT reassign_hierarchy_numbers();

-- Drop the temporary function
DROP FUNCTION reassign_hierarchy_numbers();

-- Step 2: Add unique constraint to prevent future duplicates within the same project
-- This allows duplicates across different projects but not within the same project
ALTER TABLE project_schedule_tasks 
ADD CONSTRAINT unique_hierarchy_per_project 
UNIQUE (project_id, hierarchy_number);

-- Step 3: Update the reorder function to work with the new hierarchy system
CREATE OR REPLACE FUNCTION reorder_project_tasks(
    task_id_param uuid, 
    new_order_index_param integer, 
    new_parent_id_param text DEFAULT NULL::text, 
    project_id_param uuid DEFAULT NULL::uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
    current_project_id uuid;
    new_hierarchy_number text;
    task_count integer;
BEGIN
    -- Get the project_id if not provided
    IF project_id_param IS NULL THEN
        SELECT project_id INTO current_project_id
        FROM public.project_schedule_tasks
        WHERE id = task_id_param;
    ELSE
        current_project_id := project_id_param;
    END IF;

    -- Get total task count for this project to determine the new hierarchy number
    SELECT COUNT(*) INTO task_count
    FROM public.project_schedule_tasks
    WHERE project_id = current_project_id;

    -- Calculate new hierarchy number based on position
    -- For now, use simple sequential numbering
    new_hierarchy_number := (new_order_index_param + 1)::text;

    -- If this hierarchy number already exists, find the next available one
    WHILE EXISTS (
        SELECT 1 FROM public.project_schedule_tasks
        WHERE project_id = current_project_id 
        AND hierarchy_number = new_hierarchy_number
        AND id != task_id_param
    ) LOOP
        new_hierarchy_number := (new_hierarchy_number::integer + task_count)::text;
    END LOOP;

    -- Update the moved task with new hierarchy number and parent
    UPDATE public.project_schedule_tasks
    SET hierarchy_number = new_hierarchy_number,
        parent_id = CASE 
            WHEN new_parent_id_param = '' THEN NULL
            WHEN new_parent_id_param IS NULL THEN parent_id
            ELSE new_parent_id_param
        END,
        order_index = new_order_index_param,
        updated_at = NOW()
    WHERE id = task_id_param;
    
    RETURN FOUND;
END;
$function$;