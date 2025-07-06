-- Update project_bidding_companies table to support multiple proposal files
ALTER TABLE project_bidding_companies 
ALTER COLUMN proposals TYPE text[] 
USING CASE 
  WHEN proposals IS NULL THEN NULL 
  ELSE ARRAY[proposals] 
END;