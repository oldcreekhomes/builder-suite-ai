-- Drop the existing constraint, update data, and add new constraint
ALTER TABLE company_issues DROP CONSTRAINT IF EXISTS company_issues_category_check;

UPDATE company_issues SET category = 'Purchase Orders' WHERE category = 'Orders';

ALTER TABLE company_issues ADD CONSTRAINT company_issues_category_check 
CHECK (category = ANY (ARRAY['Accounting', 'Authentication', 'Bidding', 'Budget', 'Companies', 'Files', 'Messages', 'Purchase Orders', 'Photos', 'Schedule', 'Settings']::text[]));