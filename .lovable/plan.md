## Change

In `src/components/bills/EditBillDialog.tsx`, remove the Project column from the Expense tab table only.

- Remove the "Project" `<TableHead>` from the Expense tab header.
- Remove the corresponding project `<TableCell>` (project selector) from each Expense row.
- Keep the current bill's `project_id` internally as the project for every expense line on save (unchanged behavior from before the recent addition).
- No changes to the Job Cost tab.
- No changes to `ManualBillEntry.tsx` or the account dropdown behavior — the Expense account picker still receives the bill's `projectId` so project-specific accounts (5120, 6020, etc.) remain in the list.

## Why

The Edit Bill dialog is always scoped to a single project, so the per-line Project selector was unnecessary and was not requested.
