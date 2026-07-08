## Add Notifications tab to Create New Project dialog

### UI restructure — `src/components/NewProjectDialog.tsx`
- Wrap the dialog body in `Tabs` with two tabs:
  1. **Project Information** — the current form fields (Address, Status, Total Lots, Construction Manager, Accounting Manager).
  2. **Notifications** — the same 5-channel recipient matrix used on the Edit dialog.
- Widen the dialog (`sm:max-w-[900px]`) so the matrix fits.
- Keep a single Cancel / Create Project footer shared across both tabs.

### Notifications matrix (pre-create version)
- Extract a presentational variant of the matrix into `src/components/projects/NewProjectNotificationsMatrix.tsx` — same layout, styling, and alphabetical sort as `ProjectNotificationsMatrix.tsx`, but state is held in-memory (no `projectId`, no Supabase queries/mutations).
- Local state: `Map<userId, { receive: Record<channel, boolean>, primary: Record<channel, boolean> }>` plus helpers that mirror the existing toggle behavior (checking primary auto-checks receive; only one primary per channel).
- Uses `useCompanyUsers()` for the row list.

### Validation
- On Create Project, in addition to the existing required fields, verify **each of the 5 channels has exactly one user starred as primary**.
- If any channel is missing a primary, show the Notifications tab, toast "Please select a primary contact for all 5 notification types", and highlight the missing column headers in red.

### Persistence
- After the `projects.insert()` succeeds, build the recipient rows from the in-memory state and upsert them into `project_notification_recipients` in a single call:
  - one row per user that has any `receive_*` or `is_primary_*` true, with `project_id` = new project id.
- On upsert error: toast the error but keep the project (navigate to project page as today).

### Reset
- Clear the notifications state along with the other fields when the dialog closes or after successful create.

No database or edge-function changes.