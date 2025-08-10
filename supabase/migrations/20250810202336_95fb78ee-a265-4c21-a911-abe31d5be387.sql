-- Fix duplicate order_index values by assigning sequential 1000-increment values
-- This preserves current visual order while eliminating duplicates

DO $$
DECLARE
    task_record RECORD;
    new_order_index INTEGER := 1000;
BEGIN
    -- Update tasks with new order_index values in current visual order
    FOR task_record IN 
        SELECT id 
        FROM public.project_schedule_tasks 
        ORDER BY order_index ASC, created_at ASC
    LOOP
        UPDATE public.project_schedule_tasks 
        SET order_index = new_order_index,
            updated_at = NOW()
        WHERE id = task_record.id;
        
        -- Increment by 1000 for next task
        new_order_index := new_order_index + 1000;
    END LOOP;
END $$;