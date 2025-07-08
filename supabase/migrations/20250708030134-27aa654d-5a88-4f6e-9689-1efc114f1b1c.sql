-- Fix the RLS policies for project_schedule_tasks to allow employees to create/update tasks
-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Users can create schedule tasks for their projects" ON public.project_schedule_tasks;
DROP POLICY IF EXISTS "Users can update schedule tasks for their projects" ON public.project_schedule_tasks;
DROP POLICY IF EXISTS "Users can delete schedule tasks for their projects" ON public.project_schedule_tasks;

-- Create new policies that allow both home builders and their approved employees
CREATE POLICY "Users can create schedule tasks for accessible projects" 
  ON public.project_schedule_tasks 
  FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects 
      WHERE projects.id = project_schedule_tasks.project_id 
      AND (
        projects.owner_id = auth.uid()
        OR projects.owner_id IN (
          SELECT employees.home_builder_id
          FROM employees
          WHERE employees.id = auth.uid() AND employees.confirmed = true
        )
      )
    )
  );

CREATE POLICY "Users can update schedule tasks for accessible projects" 
  ON public.project_schedule_tasks 
  FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM projects 
      WHERE projects.id = project_schedule_tasks.project_id 
      AND (
        projects.owner_id = auth.uid()
        OR projects.owner_id IN (
          SELECT employees.home_builder_id
          FROM employees
          WHERE employees.id = auth.uid() AND employees.confirmed = true
        )
      )
    )
  );

CREATE POLICY "Users can delete schedule tasks for accessible projects" 
  ON public.project_schedule_tasks 
  FOR DELETE 
  USING (
    EXISTS (
      SELECT 1 FROM projects 
      WHERE projects.id = project_schedule_tasks.project_id 
      AND (
        projects.owner_id = auth.uid()
        OR projects.owner_id IN (
          SELECT employees.home_builder_id
          FROM employees
          WHERE employees.id = auth.uid() AND employees.confirmed = true
        )
      )
    )
  );