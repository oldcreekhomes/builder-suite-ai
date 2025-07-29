-- Drop the existing RLS policy that uses get_current_user_company()
DROP POLICY IF EXISTS "Company users can access all company data" ON project_bid_packages;

-- Create a new RLS policy that directly checks user access
CREATE POLICY "Owners and employees can manage bid packages" 
ON project_bid_packages FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM users u
    JOIN projects p ON (
      (u.role = 'owner' AND p.owner_id = u.id) OR
      (u.role = 'employee' AND u.confirmed = true AND p.owner_id = u.home_builder_id)
    )
    WHERE u.id = auth.uid() 
    AND p.id = project_bid_packages.project_id
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users u
    JOIN projects p ON (
      (u.role = 'owner' AND p.owner_id = u.id) OR
      (u.role = 'employee' AND u.confirmed = true AND p.owner_id = u.home_builder_id)
    )
    WHERE u.id = auth.uid() 
    AND p.id = project_bid_packages.project_id
  )
);