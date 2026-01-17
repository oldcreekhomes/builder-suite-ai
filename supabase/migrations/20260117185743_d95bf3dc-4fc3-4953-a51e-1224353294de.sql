-- Drop the old constraint that only allows 7 categories
ALTER TABLE company_issues 
DROP CONSTRAINT IF EXISTS company_issues_category_check;

-- Add new constraint with all 11 categories
ALTER TABLE company_issues 
ADD CONSTRAINT company_issues_category_check 
CHECK (category = ANY (ARRAY[
  'Accounting',
  'Authentication', 
  'Bidding',
  'Budget',
  'Companies',
  'Files',
  'Messages',
  'Orders',
  'Photos',
  'Schedule',
  'Settings'
]));