-- Add budget lock permission to user preferences
ALTER TABLE user_notification_preferences 
ADD COLUMN can_lock_budgets BOOLEAN DEFAULT FALSE;

-- Add budget lock fields to projects table
ALTER TABLE projects 
ADD COLUMN budget_locked BOOLEAN DEFAULT FALSE,
ADD COLUMN budget_locked_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN budget_locked_by UUID REFERENCES auth.users(id),
ADD COLUMN budget_lock_notes TEXT;

-- Prevent updates to project_budgets when budget is locked
CREATE POLICY "Cannot update budget items when budget is locked"
ON project_budgets
FOR UPDATE
USING (
  NOT EXISTS (
    SELECT 1 FROM projects 
    WHERE projects.id = project_budgets.project_id 
    AND projects.budget_locked = true
  )
);

-- Prevent deletes to project_budgets when budget is locked
CREATE POLICY "Cannot delete budget items when budget is locked"
ON project_budgets
FOR DELETE
USING (
  NOT EXISTS (
    SELECT 1 FROM projects 
    WHERE projects.id = project_budgets.project_id 
    AND projects.budget_locked = true
  )
);

-- Prevent inserts to project_budgets when budget is locked
CREATE POLICY "Cannot insert budget items when budget is locked"
ON project_budgets
FOR INSERT
WITH CHECK (
  NOT EXISTS (
    SELECT 1 FROM projects 
    WHERE projects.id = project_budgets.project_id 
    AND projects.budget_locked = true
  )
);