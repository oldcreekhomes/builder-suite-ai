-- Fix all self-referencing predecessors in project f13eae11-ab55-4034-b70c-734fc3afe340
-- Each task should reference the previous task number (e.g., 4.21 → 4.20)

UPDATE project_schedule_tasks
SET 
  predecessor = jsonb_build_array(
    split_part(hierarchy_number, '.', 1) || '.' || 
    (split_part(hierarchy_number, '.', 2)::int - 1)::text
  ),
  updated_at = now()
WHERE 
  project_id = 'f13eae11-ab55-4034-b70c-734fc3afe340'
  AND hierarchy_number ~ '^4\.\d+$'
  AND split_part(hierarchy_number, '.', 2)::int > 1
  AND predecessor IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM jsonb_array_elements_text(predecessor) elem
    WHERE elem = hierarchy_number
  );