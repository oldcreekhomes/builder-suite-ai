-- Comprehensive File Recovery Migration for Project 494d10f1-cbb4-4f64-9ee9-92e755cb088f

-- Step 1: Recover all deleted files for the specific project
UPDATE public.project_files 
SET is_deleted = false, 
    updated_at = NOW()
WHERE project_id = '494d10f1-cbb4-4f64-9ee9-92e755cb088f'
  AND is_deleted = true;

-- Step 2: Ensure core folder structure exists in project_folders
INSERT INTO public.project_folders (project_id, folder_path, parent_path, folder_name, created_by)
VALUES 
  ('494d10f1-cbb4-4f64-9ee9-92e755cb088f', 'Drawings', NULL, 'Drawings', (SELECT owner_id FROM public.projects WHERE id = '494d10f1-cbb4-4f64-9ee9-92e755cb088f')),
  ('494d10f1-cbb4-4f64-9ee9-92e755cb088f', 'Drawings/Architectural', 'Drawings', 'Architectural', (SELECT owner_id FROM public.projects WHERE id = '494d10f1-cbb4-4f64-9ee9-92e755cb088f')),
  ('494d10f1-cbb4-4f64-9ee9-92e755cb088f', 'Drawings/Civil', 'Drawings', 'Civil', (SELECT owner_id FROM public.projects WHERE id = '494d10f1-cbb4-4f64-9ee9-92e755cb088f')),
  ('494d10f1-cbb4-4f64-9ee9-92e755cb088f', 'Drawings/HVAC', 'Drawings', 'HVAC', (SELECT owner_id FROM public.projects WHERE id = '494d10f1-cbb4-4f64-9ee9-92e755cb088f')),
  ('494d10f1-cbb4-4f64-9ee9-92e755cb088f', 'Drawings/Plumbing', 'Drawings', 'Plumbing', (SELECT owner_id FROM public.projects WHERE id = '494d10f1-cbb4-4f64-9ee9-92e755cb088f')),
  ('494d10f1-cbb4-4f64-9ee9-92e755cb088f', 'Drawings/Structural', 'Drawings', 'Structural', (SELECT owner_id FROM public.projects WHERE id = '494d10f1-cbb4-4f64-9ee9-92e755cb088f')),
  ('494d10f1-cbb4-4f64-9ee9-92e755cb088f', 'Permits', NULL, 'Permits', (SELECT owner_id FROM public.projects WHERE id = '494d10f1-cbb4-4f64-9ee9-92e755cb088f')),
  ('494d10f1-cbb4-4f64-9ee9-92e755cb088f', 'Other', NULL, 'Other', (SELECT owner_id FROM public.projects WHERE id = '494d10f1-cbb4-4f64-9ee9-92e755cb088f'))
ON CONFLICT (project_id, folder_path) DO NOTHING;

-- Step 3: Create any missing intermediate folders based on existing files
INSERT INTO public.project_folders (project_id, folder_path, parent_path, folder_name, created_by)
SELECT DISTINCT 
  pf.project_id,
  SUBSTRING(pf.original_filename FROM '^(.+)/[^/]+$') as folder_path,
  CASE 
    WHEN SUBSTRING(pf.original_filename FROM '^(.+)/[^/]+$') LIKE '%/%' 
    THEN SUBSTRING(SUBSTRING(pf.original_filename FROM '^(.+)/[^/]+$') FROM '^(.+)/[^/]+$')
    ELSE NULL 
  END as parent_path,
  SUBSTRING(SUBSTRING(pf.original_filename FROM '^(.+)/[^/]+$') FROM '[^/]+$') as folder_name,
  (SELECT owner_id FROM public.projects WHERE id = pf.project_id)
FROM public.project_files pf
WHERE pf.project_id = '494d10f1-cbb4-4f64-9ee9-92e755cb088f'
  AND pf.original_filename LIKE '%/%'
  AND SUBSTRING(pf.original_filename FROM '^(.+)/[^/]+$') IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.project_folders pfo 
    WHERE pfo.project_id = pf.project_id 
      AND pfo.folder_path = SUBSTRING(pf.original_filename FROM '^(.+)/[^/]+$')
  );

-- Step 4: Update folder timestamps
UPDATE public.project_folders 
SET updated_at = NOW()
WHERE project_id = '494d10f1-cbb4-4f64-9ee9-92e755cb088f';