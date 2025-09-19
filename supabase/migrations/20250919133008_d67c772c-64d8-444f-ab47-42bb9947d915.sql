-- Global File Recovery Migration
-- This will restore ALL deleted files and create missing folder structures across ALL projects

-- Step 1: Recover all deleted files across all projects
UPDATE public.project_files 
SET is_deleted = false,
    updated_at = NOW()
WHERE is_deleted = true;

-- Step 2: Create missing folder entries based on recovered file paths
-- First, create a temporary function to extract folder paths
CREATE OR REPLACE FUNCTION extract_folder_paths(file_path text, project_id_param uuid, created_by_param uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  path_parts text[];
  current_path text := '';
  parent_path text := null;
  folder_name text;
  i integer;
BEGIN
  -- Split the path by '/' and remove the filename (last part)
  path_parts := string_to_array(file_path, '/');
  
  -- Only process if there are folders (more than 1 part, last part is filename)
  IF array_length(path_parts, 1) > 1 THEN
    -- Loop through each folder level (excluding the last part which is the filename)
    FOR i IN 1..(array_length(path_parts, 1) - 1) LOOP
      folder_name := path_parts[i];
      
      -- Build current path
      IF i = 1 THEN
        current_path := folder_name;
      ELSE
        current_path := current_path || '/' || folder_name;
      END IF;
      
      -- Insert folder if it doesn't exist
      INSERT INTO public.project_folders (
        project_id,
        folder_path,
        parent_path,
        folder_name,
        created_by,
        created_at,
        updated_at
      )
      VALUES (
        project_id_param,
        current_path,
        parent_path,
        folder_name,
        created_by_param,
        NOW(),
        NOW()
      )
      ON CONFLICT (project_id, folder_path) DO NOTHING;
      
      -- Set parent path for next iteration
      parent_path := current_path;
    END LOOP;
  END IF;
END;
$$;

-- Step 3: Generate folder entries for all files that have folder paths
DO $$
DECLARE
  file_record RECORD;
BEGIN
  -- Process each file that has folders in its path
  FOR file_record IN 
    SELECT DISTINCT 
      original_filename,
      project_id,
      uploaded_by
    FROM public.project_files 
    WHERE original_filename LIKE '%/%'
      AND is_deleted = false
  LOOP
    -- Extract and create folder structure for this file
    PERFORM extract_folder_paths(
      file_record.original_filename,
      file_record.project_id,
      file_record.uploaded_by
    );
  END LOOP;
END;
$$;

-- Step 4: Clean up the temporary function
DROP FUNCTION extract_folder_paths(text, uuid, uuid);

-- Step 5: Verify recovery results
-- This will show the recovery statistics
DO $$
DECLARE
  recovered_files_count integer;
  total_folders_count integer;
  projects_affected integer;
BEGIN
  -- Count recovered files
  SELECT COUNT(*) INTO recovered_files_count
  FROM public.project_files
  WHERE is_deleted = false;
  
  -- Count total folders created
  SELECT COUNT(*) INTO total_folders_count
  FROM public.project_folders;
  
  -- Count projects with files
  SELECT COUNT(DISTINCT project_id) INTO projects_affected
  FROM public.project_files
  WHERE is_deleted = false;
  
  RAISE NOTICE 'RECOVERY COMPLETE:';
  RAISE NOTICE '- Recovered files: %', recovered_files_count;
  RAISE NOTICE '- Total folders: %', total_folders_count;  
  RAISE NOTICE '- Projects affected: %', projects_affected;
END;
$$;