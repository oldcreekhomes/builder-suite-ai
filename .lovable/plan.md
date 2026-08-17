# Update delete-payment confirmation copy

## Goal
Make the delete confirmation for consolidated bill payments read as a plain permanent deletion, without implying the underlying bills remain visible/unpaid in the app.

## Changes
1. In `src/components/accounting/AccountDetailDialog.tsx`:
   - Update the confirmation description for the consolidated bill payment delete action to:
     `"This payment will be permanently deleted from the application. Continue?"`

## Notes
- The underlying accounting behavior still posts a reversing entry and clears the allocation, but the user-facing copy should simply describe deletion.
- No other code or database changes are required.
