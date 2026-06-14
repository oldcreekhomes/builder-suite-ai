## Goal
Replace the inline "Add Issue" row with a modal dialog. All fields visible in the row become required.

## Changes

### 1. `src/components/issues/AddIssueDialog.tsx` (rewrite)
Replace the current minimal dialog with a full form containing every field from the inline row, all marked required:

- **Title** (text input) — required
- **Priority** (Select: Normal / High) — required (defaults to Normal but cannot be cleared)
- **Issue Files** (multi-file upload with selected list + remove buttons) — required, at least 1 file
- **Location** (Select with the full module list: Accounting, Authentication, Bidding, Budget, Companies, Files, Messages, Purchase Orders, Photos, Schedule, Settings) — required
- **Solution Files** (multi-file upload) — required, at least 1 file
- **Comment** (textarea) — required, non-empty

Author/Date/# are auto-populated server side and not shown in the dialog (they aren't editable in the row either).

Validation: on submit, collect missing required fields and show a single destructive toast listing them (same pattern as current `AddIssueRow.handleSave`). Disable submit while `createIssue.isPending` or uploads are in flight.

Submit flow (mirrors `AddIssueRow` + `IssuesTableRow` logic):
1. `createIssue.mutateAsync({ title, category, priority, location })`
2. On success, upload Issue Files to `issue-files` storage bucket and insert rows into `issue_files` keyed to the new `issue_id` (port `uploadFilesToIssue` from `AddIssueRow.tsx`).
3. Upload Solution Files using the same pattern used by `SolutionFilesCell` (read that file in build mode for exact bucket/table — likely `solution-files` / `solution_files`), then call `updateIssue` with the resulting `solution_files` paths.
4. Insert the comment row using the same path `IssueCommentCell` uses (read in build mode).
5. Reset form, close dialog, success toast.

Dialog sizing: `sm:max-w-[600px]`, vertically scrollable content area.

### 2. `src/components/issues/IssuesTable.tsx`
- Remove `AddIssueRow` import and the conditional `<AddIssueRow … />` render inside `<TableBody>`.
- Replace `showAddRow` state usage so the "Add Issue" button opens `AddIssueDialog` instead:
  - `const [dialogOpen, setDialogOpen] = useState(false);`
  - Button `onClick={() => setDialogOpen(true)}`
  - Render `<AddIssueDialog open={dialogOpen} onOpenChange={setDialogOpen} category={category} />` at the bottom of the component.
- Simplify the empty-state condition (no more `!showAddRow` branch).

### 3. `src/components/issues/AddIssueRow.tsx`
Delete the file — no longer used.

## Out of scope
- No schema changes; reuses existing `issues`, `issue_files`, `solution_files`, `issue_comments` tables and storage buckets.
- Inline editing in existing rows is untouched.