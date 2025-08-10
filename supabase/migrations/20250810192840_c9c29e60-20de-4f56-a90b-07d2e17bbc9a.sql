-- One-time cleanup: Fix duplicate order_index values for all existing tasks
-- This will assign sequential order_index values (0, 1, 2, 3...) to all tasks per project

DO $$
DECLARE
    project_record RECORD;
    task_record RECORD;
    new_order_index INTEGER;
BEGIN
    -- Loop through each project
    FOR project_record IN 
        SELECT DISTINCT project_id 
        FROM public.project_schedule_tasks 
        ORDER BY project_id
    LOOP
        new_order_index := 0;
        
        -- Loop through tasks in each project, ordered by current order_index and created_at
        -- This maintains the existing visual order as much as possible
        FOR task_record IN 
            SELECT id
            FROM public.project_schedule_tasks 
            WHERE project_id = project_record.project_id
            ORDER BY order_index ASC, created_at ASC
        LOOP
            -- Update each task with a sequential order_index
            UPDATE public.project_schedule_tasks 
            SET order_index = new_order_index,
                updated_at = NOW()
            WHERE id = task_record.id;
            
            new_order_index := new_order_index + 1;
        END LOOP;
        
        RAISE NOTICE 'Fixed order_index for project %, assigned % tasks', project_record.project_id, new_order_index;
    END LOOP;
END $$;