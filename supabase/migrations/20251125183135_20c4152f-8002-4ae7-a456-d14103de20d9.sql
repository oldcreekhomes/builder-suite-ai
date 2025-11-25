-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Users can view schedule tasks for their projects" ON project_schedule_tasks;
DROP POLICY IF EXISTS "Users can create schedule tasks for their projects" ON project_schedule_tasks;
DROP POLICY IF EXISTS "Users can update schedule tasks for their projects" ON project_schedule_tasks;
DROP POLICY IF EXISTS "Users can delete schedule tasks for their projects" ON project_schedule_tasks;

-- Recreate with correct role check (matching other tables like bills, accounts)
CREATE POLICY "Users can view schedule tasks for their projects"
ON project_schedule_tasks FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM projects
    WHERE projects.id = project_schedule_tasks.project_id
    AND (
      projects.owner_id = auth.uid()
      OR projects.owner_id IN (
        SELECT users.home_builder_id FROM users
        WHERE users.id = auth.uid() 
        AND users.confirmed = true 
        AND users.role = ANY (ARRAY['employee'::text, 'accountant'::text])
      )
    )
  )
);

CREATE POLICY "Users can create schedule tasks for their projects"
ON project_schedule_tasks FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM projects
    WHERE projects.id = project_schedule_tasks.project_id
    AND (
      projects.owner_id = auth.uid()
      OR projects.owner_id IN (
        SELECT users.home_builder_id FROM users
        WHERE users.id = auth.uid() 
        AND users.confirmed = true 
        AND users.role = ANY (ARRAY['employee'::text, 'accountant'::text])
      )
    )
  )
);

CREATE POLICY "Users can update schedule tasks for their projects"
ON project_schedule_tasks FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM projects
    WHERE projects.id = project_schedule_tasks.project_id
    AND (
      projects.owner_id = auth.uid()
      OR projects.owner_id IN (
        SELECT users.home_builder_id FROM users
        WHERE users.id = auth.uid() 
        AND users.confirmed = true 
        AND users.role = ANY (ARRAY['employee'::text, 'accountant'::text])
      )
    )
  )
);

CREATE POLICY "Users can delete schedule tasks for their projects"
ON project_schedule_tasks FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM projects
    WHERE projects.id = project_schedule_tasks.project_id
    AND (
      projects.owner_id = auth.uid()
      OR projects.owner_id IN (
        SELECT users.home_builder_id FROM users
        WHERE users.id = auth.uid() 
        AND users.confirmed = true 
        AND users.role = ANY (ARRAY['employee'::text, 'accountant'::text])
      )
    )
  )
);