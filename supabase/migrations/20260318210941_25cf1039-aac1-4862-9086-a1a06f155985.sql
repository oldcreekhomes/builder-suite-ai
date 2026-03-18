-- Create atomic bulk update function for hierarchy numbers
-- This replaces the fragile two-phase Promise.all approach
CREATE OR REPLACE FUNCTION public.bulk_update_hierarchy_numbers(updates jsonb)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  update_record jsonb;
  updated_count integer := 0;
BEGIN
  FOR update_record IN SELECT * FROM jsonb_array_elements(updates)
  LOOP
    UPDATE project_schedule_tasks
    SET hierarchy_number = update_record->>'hierarchy_number',
        updated_at = NOW()
    WHERE id = (update_record->>'id')::uuid;
    
    IF FOUND THEN
      updated_count := updated_count + 1;
    END IF;
  END LOOP;
  
  RETURN updated_count;
END;
$function$;