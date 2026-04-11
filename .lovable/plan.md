

## Plan: Add Per-Project "Apartments" Toggle

### Summary
Add an `apartments_enabled` boolean column to the `projects` table (default `false`). Add a Yes/No dropdown in the Edit Project dialog. Conditionally show/hide the Apartments sidebar section based on the current project's setting instead of the global permission check.

### Database Migration
- Add column: `ALTER TABLE projects ADD COLUMN apartments_enabled boolean NOT NULL DEFAULT false;`
- All existing projects default to `false` (No). You'll manually flip the two apartment projects to `true`.

### Files to Modify

**1. `src/components/EditProjectDialog.tsx`**
- Add `apartments_enabled` to `formData` state (default `"no"`)
- Initialize from `project.apartments_enabled` in the `useEffect`
- Add a third column to the Construction Manager / Accounting Manager row, making it a 3-column grid with an "Apartments" Yes/No `Select` dropdown to the right of Accounting Manager
- Include `apartments_enabled: data.apartments_enabled === "yes"` in the update payload

**2. `src/hooks/useProjects.tsx`**
- Add `apartments_enabled?: boolean` to the `Project` interface

**3. `src/components/sidebar/SidebarNavigation.tsx`**
- Instead of checking `canAccessApartments` from the global permission hook, check the current project's `apartments_enabled` field
- Fetch the project data (or use existing project context) to read `apartments_enabled`
- Remove the `useApartmentPermissions` dependency from the sidebar (or keep it as a secondary gate if desired)

**4. Supabase types** (auto-generated) -- the migration will update these automatically.

### UI Layout Change (Edit Project Dialog)
The Construction Manager / Accounting Manager row changes from a 2-column grid to a 3-column grid:

```text
| Construction Manager | Accounting Manager | Apartments    |
| [dropdown]           | [dropdown]         | [Yes/No dropdown] |
```

### What Does NOT Change
- No apartment data is deleted. The toggle only controls sidebar visibility.
- The apartment pages, inputs, and routes all remain intact.
- Users who set a project to "Yes" will see the full Apartments menu.

