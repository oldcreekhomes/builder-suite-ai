-- Drop the existing category constraint
ALTER TABLE public.company_issues 
DROP CONSTRAINT IF EXISTS company_issues_category_check;

-- Recreate the constraint to include 'Authentication'
ALTER TABLE public.company_issues 
ADD CONSTRAINT company_issues_category_check 
CHECK (category IN ('Messages', 'Files', 'Photos', 'Budget', 'Bidding', 'Schedule', 'Authentication'));