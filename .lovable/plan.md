
## Goal
Fix the “opens then instantly closes” behavior for both **Edit** and **Delete** inside **Edit Company → Representatives** so:
- Edit stays open, allows changes, and after saving returns you to the Edit Company dialog.
- Delete shows a confirmation warning and only deletes after confirming.

## What’s happening (root cause)
You have **nested Radix modals**:
- Outer modal: **EditCompanyDialog** (`@radix-ui/react-dialog`)
- Inner modal: **EditRepresentativeDialog** (`@radix-ui/react-dialog`)
- Delete confirmation: **AlertDialog** (`@radix-ui/react-alert-dialog`)

With nested portals/modals, Radix can interpret the original click as an “outside interaction” for the newly-opened modal, or the outer modal can react to interactions intended for the inner overlay. Result: `onOpenChange(false)` fires immediately and the modal closes.

Your current `stopPropagation()` on the Edit click helped some cases, but the video shows it’s still closing due to **outside-interaction / pointerdown handling**, and Delete currently doesn’t stop propagation at all.

## Plan (implementation steps)

### 1) Make Edit button stop propagation on pointerdown (not just click)
**File:** `src/components/companies/RepresentativeSelector.tsx`

- Keep the existing `onClick(e) { e.stopPropagation(); ... }`
- Add `onPointerDown={(e) => e.stopPropagation()}` to the Edit button as well.
  - Reason: Radix “outside” logic is typically pointer-driven; stopping only `click` can be too late.

### 2) Ensure Delete button trigger also stops propagation (pointerdown + click)
**File:** `src/components/ui/delete-button.tsx`

Update the internal `<Button ... onClick={...}>` so it:
- Accepts the event parameter
- Calls `e.stopPropagation()` (and optionally `e.preventDefault()` if needed)
- Also add `onPointerDown={(e) => e.stopPropagation()}` on that button

This prevents the outer dialog from treating the delete-trigger interaction as an outside click and closing the confirmation immediately.

### 3) Prevent the inner “Edit Representative” dialog from auto-closing due to outside interactions in nested-modal context
**File:** `src/components/companies/EditRepresentativeDialog.tsx`

Update the Radix `<DialogContent>` to defensively prevent immediate close in nested usage:

- Add:
  - `onInteractOutside={(e) => e.preventDefault()}`
  - `onPointerDownOutside={(e) => e.preventDefault()}` (if supported by the wrapped component props)
- Optionally (if needed after testing): set `modal={false}` on the inner `<Dialog ...>` to avoid nested-modal focus/interaction conflicts while still keeping the UI usable within Edit Company.

We’ll start with `onInteractOutside/onPointerDownOutside` first, because it keeps the dialog modal behavior while eliminating the “instant close”.

### 4) Prevent the Delete confirmation (AlertDialog) from instantly closing in nested context
**File:** `src/components/ui/delete-confirmation-dialog.tsx`

Add `onPointerDownOutside={(e) => e.preventDefault()}` to `<AlertDialogContent>` (and/or `onInteractOutside` if available).
- This ensures the confirmation dialog doesn’t immediately close due to nested-dialog outside detection.

### 5) Verify the intended UX flows end-to-end
Manual test checklist:
1. Go to **Companies → Edit Company → Representatives tab**
2. Click **Edit** on a representative:
   - Dialog stays open
   - You can change fields
   - Click **Update Representative**:
     - Success toast appears
     - Edit Representative dialog closes
     - You remain in Edit Company dialog on the Representatives tab
     - Table reflects updates (type badge, email/phone, etc.)
3. Click **Delete**:
   - Confirmation dialog stays open
   - Clicking **Cancel** closes confirmation only
   - Clicking **Delete** deletes and refreshes list, with toast shown

## Notes / Risk management
- This fix is targeted to the nested modal interaction problem and uses Radix-supported event hooks to prevent “outside click” closures.
- If `onInteractOutside` prevention is too strict (e.g., you want clicking the backdrop to close the inner modal), we can refine it to only prevent close when the outer Edit Company dialog is open, or only during the initial open tick.

## Files expected to change
- `src/components/companies/RepresentativeSelector.tsx` (Edit button pointerdown stop)
- `src/components/ui/delete-button.tsx` (stop propagation on delete trigger)
- `src/components/companies/EditRepresentativeDialog.tsx` (prevent outside-interaction auto close)
- `src/components/ui/delete-confirmation-dialog.tsx` (prevent outside-interaction auto close)
