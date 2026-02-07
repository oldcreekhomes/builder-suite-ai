
## Fix: Keep Edit Company Dialog Open After Updating Representative

### Problem Analysis
When you update a representative in the Edit Representative dialog and click "Update Representative":
1. The representative saves successfully
2. Both the Edit Representative dialog AND the Edit Company dialog close
3. You're returned to the main Companies page

However, when you **delete** a representative, it works correctly - you stay in the Edit Company dialog.

### Root Cause
The issue is related to how Radix UI handles nested modal dialogs. When the inner `EditRepresentativeDialog` closes via `onOpenChange(false)`, Radix's modal behavior (focus trapping, escape key handling, outside click detection) can inadvertently trigger the parent dialog to also close.

The Delete flow uses `AlertDialog` which has different internal handling than `Dialog`. When the Edit Representative dialog (which is a `Dialog`) closes, the focus restoration and modal cleanup may be causing the parent Edit Company dialog to receive an unexpected close signal.

### Solution
Apply `modal={false}` to the inner Edit Representative dialog. This disables Radix's modal behaviors (focus lock, outside pointer event blocking) that cause conflicts with nested modals. The dialog will still appear and function normally, but it won't fight with the parent dialog's modal state.

This is a targeted, safe fix that:
- Preserves all existing functionality (form submission, validation, styling)
- Only changes the modal behavior of the nested dialog
- Won't affect the parent Edit Company dialog's modal behavior

---

## Implementation

### File: `src/components/companies/EditRepresentativeDialog.tsx`

**Change:** Add `modal={false}` to the Dialog component.

**Location:** Line 145

**Before:**
```tsx
return (
  <Dialog open={open} onOpenChange={onOpenChange}>
```

**After:**
```tsx
return (
  <Dialog open={open} onOpenChange={onOpenChange} modal={false}>
```

---

## Technical Details

Setting `modal={false}` on a Radix Dialog:
- Disables the focus lock (focus can move to other elements)
- Disables the outside click handler (we already have our own via `onPointerDownOutside` and `onInteractOutside` on DialogContent)
- Prevents interference with the parent dialog's modal state

This is a common pattern when using nested Radix dialogs and is the recommended approach when modal-on-modal conflicts occur.

---

## Files to Change
- `src/components/companies/EditRepresentativeDialog.tsx` (add `modal={false}` to Dialog)

---

## Expected Result
After this fix:
1. Click Edit on a representative in Edit Company → Representatives tab
2. Edit Representative dialog opens and stays open
3. Make changes and click "Update Representative"
4. Edit Representative dialog closes
5. You remain in the Edit Company dialog on the Representatives tab
6. The representatives list updates with your changes
7. Delete flow continues to work as before

---

## Testing Steps
1. Go to Companies → click Edit on a company
2. Go to Representatives tab
3. Click Edit on a representative
4. Change the first name and click "Update Representative"
5. Verify you stay in the Edit Company dialog
6. Verify the representative's name is updated in the list
7. Test Cancel button - should also return to Edit Company
8. Test Delete - should continue to work correctly
