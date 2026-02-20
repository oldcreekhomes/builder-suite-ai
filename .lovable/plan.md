

## Fix: Remove `role = 'employee'` From project_account_exclusions RLS Policies (Take 3)

### Problem

The RLS policies on `project_account_exclusions` still contain `users.role = 'employee'` in all three policies (SELECT, INSERT, DELETE). Jole Ann Sorensen has `role = 'accountant'`, so she is blocked every time. Previous migration attempts did not apply successfully.

### What Will Change

The three existing RLS policies will be dropped and recreated. The **only** change is removing `AND (users.role = 'employee'::text)` from the subquery. The new condition allows any confirmed company member regardless of their role text.

### Access Control Model After Fix

- **Database layer (RLS)**: Ensures users can only touch data belonging to their company. No role filtering -- just company membership via `home_builder_id` + `confirmed = true`.
- **Application layer**: The "Edit Projects" toggle in Employee Access & Preferences controls who can open the Edit Project dialog and make changes. This is where you grant or revoke project editing for individual employees.

### Technical Details

Single database migration:

```sql
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
```

No code changes needed. Only this database migration.

