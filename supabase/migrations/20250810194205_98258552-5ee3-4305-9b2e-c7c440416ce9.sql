-- Fix corrupted parent_id relationships and cleanup order_index values
-- This will restore proper hierarchy for tasks that were incorrectly nested

DO $$
DECLARE
    project_record RECORD;
    task_record RECORD;
    new_order_index INTEGER;
BEGIN
    -- First, fix the corrupted parent_id relationships
    -- Set top-level groups that were incorrectly nested back to parent_id = null
    UPDATE public.project_schedule_tasks 
    SET parent_id = null, updated_at = NOW()
    WHERE task_name IN (
        'PRIOR TO CLOSING',
        'UTILITY RECONNECTIONS',
        'PERMITTING', 
        'UTILITY DISCONNECTIONS',
        'BIDDING',
        'DESIGN'
    ) AND parent_id IS NOT NULL;

    RAISE NOTICE 'Fixed corrupted parent_id relationships for top-level groups';

    -- Now fix the order_index values for all tasks
    -- Loop through each project
    FOR project_record IN 
        SELECT DISTINCT project_id 
        FROM public.project_schedule_tasks 
        ORDER BY project_id
    LOOP
        -- Reset order_index for top-level tasks (parent_id IS NULL)
        new_order_index := 0;
        FOR task_record IN 
            SELECT id
            FROM public.project_schedule_tasks 
            WHERE project_id = project_record.project_id 
            AND parent_id IS NULL
            ORDER BY created_at ASC
        LOOP
            UPDATE public.project_schedule_tasks 
            SET order_index = new_order_index, updated_at = NOW()
            WHERE id = task_record.id;
            new_order_index := new_order_index + 1;
        END LOOP;
        
        -- Reset order_index for child tasks within each parent group
        FOR task_record IN 
            SELECT DISTINCT parent_id
            FROM public.project_schedule_tasks 
            WHERE project_id = project_record.project_id 
            AND parent_id IS NOT NULL
        LOOP
            new_order_index := 0;
            FOR task_record IN 
                SELECT id
                FROM public.project_schedule_tasks 
                WHERE project_id = project_record.project_id 
                AND parent_id = task_record.parent_id
                ORDER BY created_at ASC
            LOOP
                UPDATE public.project_schedule_tasks 
                SET order_index = new_order_index, updated_at = NOW()
                WHERE id = task_record.id;
                new_order_index := new_order_index + 1;
            END LOOP;
        END LOOP;
        
        RAISE NOTICE 'Fixed hierarchy and order_index for project %', project_record.project_id;
    END LOOP;
END $$;