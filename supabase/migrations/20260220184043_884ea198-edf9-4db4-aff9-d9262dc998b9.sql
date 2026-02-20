
DROP POLICY IF EXISTS "Users can view exclusions for their projects" ON project_account_exclusions;
DROP POLICY IF EXISTS "Users can insert exclusions for their projects" ON project_account_exclusions;
DROP POLICY IF EXISTS "Users can delete exclusions for their projects" ON project_account_exclusions;

CREATE POLICY "Users can view exclusions for their projects"
ON project_account_exclusions FOR SELECT USING (
  (project_id IN (SELECT id FROM projects WHERE owner_id = auth.uid()))
  OR
  (project_id IN (
    SELECT id FROM projects WHERE owner_id = (
      SELECT home_builder_id FROM users
      WHERE id = auth.uid() AND confirmed = true
    )
  ))
);

CREATE POLICY "Users can insert exclusions for their projects"
ON project_account_exclusions FOR INSERT WITH CHECK (
  (project_id IN (SELECT id FROM projects WHERE owner_id = auth.uid()))
  OR
  (project_id IN (
    SELECT id FROM projects WHERE owner_id = (
      SELECT home_builder_id FROM users
      WHERE id = auth.uid() AND confirmed = true
    )
  ))
);

CREATE POLICY "Users can delete exclusions for their projects"
ON project_account_exclusions FOR DELETE USING (
  (project_id IN (SELECT id FROM projects WHERE owner_id = auth.uid()))
  OR
  (project_id IN (
    SELECT id FROM projects WHERE owner_id = (
      SELECT home_builder_id FROM users
      WHERE id = auth.uid() AND confirmed = true
    )
  ))
);
