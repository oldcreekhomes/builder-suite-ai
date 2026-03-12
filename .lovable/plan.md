

## Plan: Fix Edit Project Dialog Overflow & Standardize Lot Actions

### Problem
1. **Dialog overflow**: The lots table grows unbounded inside the dialog, pushing the Cancel/Update buttons off-screen with no way to scroll.
2. **Lot actions**: Edit (pencil) and Delete (trash) icons are inline buttons instead of the standardized 3-dot `TableRowActions` dropdown used everywhere else.

### Changes

#### 1. `src/components/EditProjectDialog.tsx`
- Add `max-h-[80vh]` and `overflow-y-auto` to the DialogContent or the form's inner content area so the dialog scrolls when lots push content beyond viewport height.
- Ensure the Cancel/Update buttons remain visible (sticky footer or within scroll area).

#### 2. `src/components/LotManagementSection.tsx`
- Constrain the lots table with `max-h-[240px] overflow-y-auto` on the table wrapper so it scrolls internally instead of growing the dialog infinitely.
- Replace the inline Pencil/Trash2 buttons with `TableRowActions` dropdown (3-dot menu) containing "Edit" and "Delete Lot" (destructive, with existing confirmation dialog). This matches the standardized pattern used across Companies, POs, Bills, etc.
- Keep the inline Check/X buttons for the active editing state (those are contextual save/cancel, not row actions).

