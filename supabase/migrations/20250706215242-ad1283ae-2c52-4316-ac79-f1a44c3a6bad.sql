-- Change files column from JSONB to text array to match project_bid_package_companies.proposals
ALTER TABLE cost_code_specifications 
ALTER COLUMN files TYPE text[] USING 
  CASE 
    WHEN files IS NULL THEN NULL
    WHEN jsonb_array_length(files) = 0 THEN '{}'::text[]
    ELSE ARRAY(SELECT jsonb_array_elements_text(files))
  END;