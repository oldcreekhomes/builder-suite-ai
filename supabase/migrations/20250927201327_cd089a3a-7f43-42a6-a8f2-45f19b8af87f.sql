-- Add solution column to company_issues table
ALTER TABLE company_issues 
ADD COLUMN solution text,
ADD COLUMN solution_files text[] DEFAULT '{}';

-- Update updated_at trigger for company_issues to handle the new columns
-- (The trigger already exists and will automatically handle these new columns)