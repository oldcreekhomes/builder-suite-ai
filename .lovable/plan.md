

## Fix: RLS Policies on project_account_exclusions Still Blocking Accountants

### Problem

The current RLS policies on `project_account_exclusions` still contain `role = 'employee'` in their conditions. Jole Ann Sorensen has `role = 'accountant'`, so she is blocked. The previous migration either was not applied or was overwritten.

### Solution

Run a new migration that drops all 3 existing policies and recreates them without the `role = 'employee'` filter. The new policies will allow any confirmed user whose `home_builder_id` matches the project owner -- matching the broader pattern used by the `projects` table.

### Technical Details

Single database migration with this SQL:

```sql
-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Users can view exclusions for their projects" ON project_account_exclusions;
DROP POLICY IF EXISTS "Users can insert exclusions for their projects" ON project_account_exclusions;
DROP POLICY IF EXISTS "Users can delete exclusions for their projects" ON project_account_exclusions;

-- Recreate SELECT policy: owner OR any confirmed company member
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

-- Recreate INSERT policy
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

-- Recreate DELETE policy
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
```

The key change: removing `AND (users.role = 'employee'::text)` so that accountants, construction managers, and any other confirmed team member can access the table. Access control remains governed by the "Edit Projects" toggle in the Employee Access panel.

No code changes needed -- only this database migration.
