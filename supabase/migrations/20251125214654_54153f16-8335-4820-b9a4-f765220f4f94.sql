-- Drop existing complex RLS policy on project_budgets
DROP POLICY IF EXISTS "Company users can access all company data" ON project_budgets;

-- Create simple owner-based RLS policy for budgets
CREATE POLICY "Budget items scoped to home builder" ON project_budgets
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM projects p 
    WHERE p.id = project_budgets.project_id 
    AND (
      p.owner_id = auth.uid() 
      OR p.owner_id IN (
        SELECT u.home_builder_id 
        FROM users u 
        WHERE u.id = auth.uid() 
        AND u.confirmed = true 
        AND u.role IN ('employee', 'accountant')
      )
    )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM projects p 
    WHERE p.id = project_budgets.project_id 
    AND (
      p.owner_id = auth.uid() 
      OR p.owner_id IN (
        SELECT u.home_builder_id 
        FROM users u 
        WHERE u.id = auth.uid() 
        AND u.confirmed = true 
        AND u.role IN ('employee', 'accountant')
      )
    )
  )
);