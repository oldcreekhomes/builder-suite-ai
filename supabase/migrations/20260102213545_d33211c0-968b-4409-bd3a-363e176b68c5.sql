-- Restore sequential predecessors for project 8bf27a4c-9044-41d9-96be-3b75c6d0390e
-- Task 8.7 gets 8.5 as predecessor (since 8.6 was deleted)
UPDATE project_schedule_tasks 
SET predecessor = '["8.5"]'::jsonb, updated_at = NOW()
WHERE project_id = '8bf27a4c-9044-41d9-96be-3b75c6d0390e' 
AND hierarchy_number = '8.7';

-- Tasks 8.8 through 8.67 get sequential predecessors
UPDATE project_schedule_tasks 
SET predecessor = ('["8.' || (CAST(SPLIT_PART(hierarchy_number, '.', 2) AS INTEGER) - 1) || '"]')::jsonb,
    updated_at = NOW()
WHERE project_id = '8bf27a4c-9044-41d9-96be-3b75c6d0390e' 
AND hierarchy_number LIKE '8.%'
AND CAST(SPLIT_PART(hierarchy_number, '.', 2) AS INTEGER) >= 8
AND predecessor IS NULL;