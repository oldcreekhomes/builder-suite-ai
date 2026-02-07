
## What I found (why it still closes instantly)
Your Edit Company screen is a Radix `Dialog`. Inside it, you open:
- another Radix `Dialog` (Edit Representative), and
- a Radix `AlertDialog` (Delete confirmation)

These are “nested modals” that render in **portals** (they get moved to the end of the `<body>`). Radix’s “outside interaction” logic is handled via **document-level pointer events** (often in capture phase). That means:
- `e.stopPropagation()` on the button click is sometimes not enough, because Radix may have already handled the pointer event before your handler runs.
- The parent dialog can interpret the opening click (or the follow-up focus change) as an outside interaction and immediately close the child/parent dialog.

This is why both **Edit** and **Delete** still “flash open then close.”

## Goal
Make Edit and Delete dialogs reliably stay open:
- Click **Edit** → the Edit Representative dialog stays open and can be saved.
- Click **Delete** → the confirmation dialog stays open until the user confirms or cancels.
- After save/delete, you remain in the Edit Company dialog and the reps list updates.

---

## Implementation approach (robust fix)
We’ll fix this at the **dialog system level** and at the **trigger buttons**, using capture-phase event handling + better “nested Radix portal” detection.

### A) Make the base `DialogContent` ignore interactions coming from other Radix dialogs/alert-dialogs
**File:** `src/components/ui/dialog.tsx`

Update the existing `onInteractOutside` handler in `DialogContent` to also prevent the parent dialog from closing when the interaction originates from:
- an element inside another Radix dialog content, or
- an element inside an alert-dialog content

Concretely, extend the existing Google Places exception to also check for:
- `target.closest('[data-radix-dialog-content]')`
- `target.closest('[data-radix-alert-dialog-content]')`

If true → `e.preventDefault()` and return.

Why this helps:
- When the inner modal is portalled to `<body>`, clicks inside it are “outside” of the parent dialog’s DOM.
- This prevents the parent from closing when you interact with the child modal (and also helps with the initial open in some nested timing cases).

### B) Stop pointer events at capture-phase on the Edit and Delete triggers
**File:** `src/components/companies/RepresentativeSelector.tsx`

On the **Edit** button:
- Add `onPointerDownCapture={(e) => e.stopPropagation()}`
- Keep the existing `onPointerDown` and `onClick`, but the key addition is the **capture** handler.

Why:
- Radix listens very early; capture-phase suppression is more reliable than bubble-only suppression.

### C) Stop pointer events at capture-phase inside the shared DeleteButton trigger
**File:** `src/components/ui/delete-button.tsx`

On the internal `<Button>` that opens the confirmation:
- Add `onPointerDownCapture={(e) => e.stopPropagation()}`
- Keep `onPointerDown` and `onClick` stopPropagation as well.

This ensures the outer Edit Company dialog doesn’t treat the delete-trigger pointerdown as an outside interaction.

### D) If needed, make Edit Representative dialog non-modal to avoid nested-modal focus locking conflicts (fallback)
**File:** `src/components/representatives/EditRepresentativeDialog.tsx`

If A–C still doesn’t fully resolve the “flash close” in your environment, apply this targeted fallback:
- Change the inner `<Dialog ...>` to `<Dialog modal={false} ...>`

Why:
- `modal={false}` disables some of Radix’s modal behaviors (focus lock / outside pointer event blocking) that frequently cause nested-modal instability.

We will implement A–C first; D is a controlled fallback if the issue persists after A–C.

### E) Confirm Delete behavior remains safe
Your current Delete flow already requires confirmation:
- Clicking Delete opens `DeleteConfirmationDialog`
- The representative is only deleted when the user clicks the “Delete” button in that dialog

We’ll keep this behavior; the fix is only to prevent the dialog from closing instantly.

---

## Step-by-step changes (what I will edit)
1. **`src/components/ui/dialog.tsx`**
   - Update `onInteractOutside` in `DialogContent`:
     - Keep existing `.pac-container` exception
     - Add checks for nested Radix contents (`data-radix-dialog-content` and `data-radix-alert-dialog-content`)
     - `preventDefault()` when detected

2. **`src/components/companies/RepresentativeSelector.tsx`**
   - Add `onPointerDownCapture` stopPropagation to the Edit button

3. **`src/components/ui/delete-button.tsx`**
   - Add `onPointerDownCapture` stopPropagation to the delete trigger button

4. **Re-test flow**
   - Open Edit Company → Representatives
   - Click Edit: dialog stays open, make change, click Update: dialog closes, returns to Edit Company, list refreshes
   - Click Delete: confirmation dialog stays open; Cancel closes it; Delete performs deletion and list refreshes

5. **If still flashing** (only then)
   - **`src/components/representatives/EditRepresentativeDialog.tsx`** set `modal={false}` on the inner dialog root

---

## Acceptance criteria (what “fixed” looks like)
- Edit dialog never closes immediately after opening; user can type and save.
- Delete confirmation never closes immediately after opening; user must explicitly confirm/cancel.
- After saving/deleting, user remains in the Edit Company dialog and sees updated reps list.

---

## Notes / risks
- Preventing parent dialogs from closing when interacting with nested dialogs is generally safe and is a common Radix pattern.
- The `modal={false}` fallback slightly changes focus/scroll trapping behavior for the inner dialog; we will only apply it if A–C is not sufficient.

