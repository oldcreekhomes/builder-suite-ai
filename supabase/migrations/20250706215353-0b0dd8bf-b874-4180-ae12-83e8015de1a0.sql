-- Step 1: Add new text array column
ALTER TABLE cost_code_specifications ADD COLUMN files_new text[];

-- Step 2: Migrate existing JSONB data to text array
UPDATE cost_code_specifications 
SET files_new = 
  CASE 
    WHEN files IS NULL THEN NULL
    WHEN files = '[]'::jsonb THEN '{}'::text[]
    ELSE (
      SELECT array_agg(value->>0) 
      FROM jsonb_array_elements(files) AS value
    )
  END;

-- Step 3: Drop old JSONB column
ALTER TABLE cost_code_specifications DROP COLUMN files;

-- Step 4: Rename new column to original name
ALTER TABLE cost_code_specifications RENAME COLUMN files_new TO files;