

## Fix: Double Delete Confirmation in File Manager

**Problem**: Clicking "Delete" on a file or folder triggers two sequential confirmation dialogs because:
1. `TableRowActions` has `requiresConfirmation: true`, showing its built-in `DeleteConfirmationDialog`
2. The `onClick` handler sets `deleteFile`/`deleteFolder` state, which opens a second standalone `DeleteConfirmationDialog`

**Root Cause**: Lines 504-511 (file) and 449-456 (folder) in `SimpleFileList.tsx` set both `requiresConfirmation: true` AND use `onClick` to set state that triggers a separate dialog (lines 520-534).

### Fix

**File: `src/components/files/SimpleFileList.tsx`**

Remove `requiresConfirmation`, `confirmTitle`, and `confirmDescription` from both the file and folder delete actions in `TableRowActions`. The `onClick` will simply set state (`setDeleteFile` / `setDeleteFolder`), and the standalone `DeleteConfirmationDialog` components (already rendered at lines 520-534) will handle the single confirmation.

**Before** (file delete action, ~line 504):
```tsx
{
  label: 'Delete',
  onClick: () => setDeleteFile(file),
  variant: 'destructive',
  requiresConfirmation: true,
  confirmTitle: 'Delete File',
  confirmDescription: `Are you sure...`,
}
```

**After**:
```tsx
{
  label: 'Delete',
  onClick: () => setDeleteFile(file),
  variant: 'destructive',
}
```

Same change for the folder delete action (~line 449). Result: one confirmation dialog per delete, not two.

