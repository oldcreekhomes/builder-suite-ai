

## Restore 3-dot Actions Menu with "Close" and "Delete" Options

### What will change

The current green checkmark button on each issue row will be replaced with the standard 3-dot menu (`TableRowActions`), offering two options:

1. **Close** -- Opens the Resolve Confirmation Dialog (with the CC user checkboxes), sends the closure email to the creator + any selected users, and marks the issue as Resolved.
2. **Delete** -- Shows a destructive confirmation dialog, then permanently deletes the issue from the database.

### Implementation

**1. Add a `deleteIssue` mutation to `src/hooks/useIssueMutations.ts`**
- New mutation that deletes the issue row from `company_issues` (and associated `issue_files` records/storage files).
- Invalidates the relevant query caches on success.

**2. Update `src/components/issues/IssuesTable.tsx`**
- Destructure `deleteIssue` from `useIssueMutations()`.
- Add a `handleDeleteIssue` handler and pass it as `onDelete` to each `IssuesTableRow`.

**3. Rewrite the Actions cell in `src/components/issues/IssuesTableRow.tsx`**
- Import both `TableRowActions` and `ResolveButton` (or just inline the resolve dialog state).
- Instead of rendering a standalone `ResolveButton`, render a custom 3-dot dropdown with two menu items:
  - **Close**: triggers a `ResolveConfirmationDialog` (with CC user selection). On confirm, calls `onResolve(issue.id, ccUserIds)`.
  - **Delete**: triggers a `DeleteConfirmationDialog`. On confirm, calls `onDelete(issue.id)`.
- Accept new prop `onDelete: (id: string) => void`.

**4. Wire up the props**
- `IssuesTableRowProps` gains `onDelete` and `isDeleting`.
- `IssuesTable` passes `onDelete={handleDeleteIssue}` and `isDeleting={deleteIssue.isPending}`.

### Files changed
| File | Change |
|------|--------|
| `src/hooks/useIssueMutations.ts` | Add `deleteIssue` mutation |
| `src/components/issues/IssuesTable.tsx` | Wire `deleteIssue` + pass `onDelete` prop |
| `src/components/issues/IssuesTableRow.tsx` | Replace `ResolveButton` with 3-dot menu containing Close (with CC dialog) and Delete options |

