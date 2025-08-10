-- Fix hierarchy numbers to preserve parent-child relationships
-- Step 1: Temporarily drop the unique constraint
ALTER TABLE project_schedule_tasks 
DROP CONSTRAINT IF EXISTS unique_hierarchy_per_project;

-- Step 2: Rebuild hierarchy with proper parent-child relationships
CREATE OR REPLACE FUNCTION rebuild_hierarchy_with_relationships()
RETURNS void AS $$
DECLARE
    project_record RECORD;
    task_record RECORD;
    hierarchy_counter INTEGER;
BEGIN
    -- Process each project separately
    FOR project_record IN 
        SELECT DISTINCT project_id FROM project_schedule_tasks
    LOOP
        hierarchy_counter := 1;
        
        -- First, handle root tasks (tasks with no parent)
        FOR task_record IN
            SELECT id, parent_id, created_at
            FROM project_schedule_tasks 
            WHERE project_id = project_record.project_id
              AND (parent_id IS NULL OR parent_id = '')
            ORDER BY created_at
        LOOP
            -- Update root task with simple number
            UPDATE project_schedule_tasks 
            SET hierarchy_number = hierarchy_counter::text,
                updated_at = NOW()
            WHERE id = task_record.id;
            
            -- Now handle children of this root task
            PERFORM assign_child_hierarchy_numbers(task_record.id, hierarchy_counter::text, project_record.project_id);
            
            hierarchy_counter := hierarchy_counter + 1;
        END LOOP;
        
        RAISE NOTICE 'Rebuilt hierarchy for project %', project_record.project_id;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Recursive function to assign hierarchy numbers to children
CREATE OR REPLACE FUNCTION assign_child_hierarchy_numbers(
    parent_task_id uuid, 
    parent_hierarchy text, 
    project_id_param uuid
)
RETURNS void AS $$
DECLARE
    child_record RECORD;
    child_counter INTEGER;
    child_hierarchy text;
BEGIN
    child_counter := 1;
    
    -- Get all direct children of this parent
    FOR child_record IN
        SELECT id, created_at
        FROM project_schedule_tasks 
        WHERE project_id = project_id_param
          AND parent_id = parent_task_id::text
        ORDER BY created_at
    LOOP
        -- Create hierarchical number like "1.1", "1.2", etc.
        child_hierarchy := parent_hierarchy || '.' || child_counter::text;
        
        -- Update child task
        UPDATE project_schedule_tasks 
        SET hierarchy_number = child_hierarchy,
            updated_at = NOW()
        WHERE id = child_record.id;
        
        -- Recursively handle grandchildren
        PERFORM assign_child_hierarchy_numbers(child_record.id, child_hierarchy, project_id_param);
        
        child_counter := child_counter + 1;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Step 3: Execute the rebuild
SELECT rebuild_hierarchy_with_relationships();

-- Step 4: Clean up temporary functions
DROP FUNCTION assign_child_hierarchy_numbers(uuid, text, uuid);
DROP FUNCTION rebuild_hierarchy_with_relationships();

-- Step 5: Add back the unique constraint
ALTER TABLE project_schedule_tasks 
ADD CONSTRAINT unique_hierarchy_per_project 
UNIQUE (project_id, hierarchy_number);