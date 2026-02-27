
## Fix: Restore the Resolve dialog with CC user selection on Issues table

### Problem
The Issues table row uses `TableRowActions` with a generic `DeleteConfirmationDialog` for the Resolve action. This shows a simple "Cancel / Delete" dialog with no option to CC other users. The dedicated `ResolveButton` and `ResolveConfirmationDialog` components already exist and support selecting company users to CC on the resolution email -- they're just not being used.

### Solution
Replace the `TableRowActions` usage in `IssuesTableRow.tsx` with the `ResolveButton` component.

### Changes (1 file)

**File: `src/components/issues/IssuesTableRow.tsx`**

1. Import `ResolveButton` from `@/components/ui/resolve-button`
2. Replace the Actions table cell that currently renders `TableRowActions` with a `ResolveButton` that:
   - Calls `onResolve(issue.id, ccUserIds)` with the selected CC users
   - Passes `authorId={issue.created_by}` so the author is excluded from the CC list
   - Shows the proper "Resolve Issue" confirmation dialog with the user selection checkboxes
   - Uses the green resolve styling instead of the red "Delete" button

This restores the original behavior: clicking Resolve opens a dialog that always sends the email to the issue creator and lets you optionally CC other company users.
