
# Fix Plan: Edit Representative Dialog Closing Issue

## Problem Summary
When clicking the Edit button in the Edit Company > Representatives tab, the Edit Representative dialog opens briefly then closes immediately. This is caused by event propagation - the click event bubbles up through the nested dialog structure and triggers unintended behavior.

## Root Cause
The Edit button in `RepresentativeSelector.tsx` lacks `e.stopPropagation()`, allowing the click event to propagate to parent elements (the table row or outer dialog), which interferes with the nested `EditRepresentativeDialog`.

## Solution
Add `e.stopPropagation()` to the Edit button's onClick handler to prevent the click event from bubbling up.

## File to Modify

### `src/components/companies/RepresentativeSelector.tsx`

**Line 160** - Update the Edit button onClick handler:

Current code:
```tsx
<Button 
  variant="ghost" 
  size="sm"
  onClick={() => setEditingRep(representative)}
  className="h-6 w-6 p-0 flex items-center justify-center"
>
```

Updated code:
```tsx
<Button 
  variant="ghost" 
  size="sm"
  onClick={(e) => {
    e.stopPropagation();
    setEditingRep(representative);
  }}
  className="h-6 w-6 p-0 flex items-center justify-center"
>
```

## Delete Button Confirmation - Status Check

The Delete button already includes a confirmation dialog. When clicked:
1. Opens a confirmation dialog with the title "Delete Representative"
2. Shows the message "Are you sure you want to delete [First Name] [Last Name]?"
3. Provides "Cancel" and "Delete" buttons
4. Only deletes the representative if the user explicitly clicks "Delete"

No changes needed for the Delete functionality - it's already safe and working correctly.

## Summary

| Issue | Status | Action |
|-------|--------|--------|
| Edit dialog closes immediately | Bug | Add `e.stopPropagation()` to Edit button |
| Delete confirmation dialog | Working | No changes needed |
