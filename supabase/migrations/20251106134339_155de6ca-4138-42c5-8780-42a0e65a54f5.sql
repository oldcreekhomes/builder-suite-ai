-- Add company_name column if not exists
ALTER TABLE budget_warning_rules 
ADD COLUMN IF NOT EXISTS company_name TEXT;

-- Update company_name from users table
UPDATE budget_warning_rules bwr
SET company_name = u.company_name
FROM users u
WHERE bwr.user_id = u.id
  AND bwr.company_name IS NULL
  AND u.company_name IS NOT NULL;

-- Delete orphaned rules
DELETE FROM budget_warning_rules
WHERE company_name IS NULL;

-- Deduplicate: Keep only the most recently updated rule for each (company_name, rule_type)
DELETE FROM budget_warning_rules bwr1
WHERE bwr1.id NOT IN (
  SELECT DISTINCT ON (company_name, rule_type) id
  FROM budget_warning_rules
  ORDER BY company_name, rule_type, updated_at DESC
);

-- Now make company_name NOT NULL
ALTER TABLE budget_warning_rules 
ALTER COLUMN company_name SET NOT NULL;

-- Drop old unique constraint if it exists
ALTER TABLE budget_warning_rules 
DROP CONSTRAINT IF EXISTS budget_warning_rules_user_id_rule_type_key;

-- Add new unique constraint on (company_name, rule_type)
ALTER TABLE budget_warning_rules 
ADD CONSTRAINT budget_warning_rules_company_rule_type_key 
UNIQUE (company_name, rule_type);

-- Update RLS policies
DROP POLICY IF EXISTS "Users can view their own warning rules" ON budget_warning_rules;
DROP POLICY IF EXISTS "Users can insert their own warning rules" ON budget_warning_rules;
DROP POLICY IF EXISTS "Users can update their own warning rules" ON budget_warning_rules;
DROP POLICY IF EXISTS "Users can delete their own warning rules" ON budget_warning_rules;

-- New RLS policies for company-wide access
CREATE POLICY "Company users can view warning rules"
ON budget_warning_rules FOR SELECT
USING (
  company_name IN (
    SELECT company_name 
    FROM users 
    WHERE id = auth.uid()
  )
);

CREATE POLICY "Only owners can insert warning rules"
ON budget_warning_rules FOR INSERT
WITH CHECK (
  company_name IN (
    SELECT u.company_name 
    FROM users u
    WHERE u.id = auth.uid() 
    AND has_role(auth.uid(), 'owner'::app_role)
  )
);

CREATE POLICY "Only owners can update warning rules"
ON budget_warning_rules FOR UPDATE
USING (
  company_name IN (
    SELECT u.company_name 
    FROM users u
    WHERE u.id = auth.uid() 
    AND has_role(auth.uid(), 'owner'::app_role)
  )
);

CREATE POLICY "Only owners can delete warning rules"
ON budget_warning_rules FOR DELETE
USING (
  company_name IN (
    SELECT u.company_name 
    FROM users u
    WHERE u.id = auth.uid() 
    AND has_role(auth.uid(), 'owner'::app_role)
  )
);