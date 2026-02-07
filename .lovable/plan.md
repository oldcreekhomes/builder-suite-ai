
<context>
User-visible bug: In the Edit Company → Representatives tab, saving changes in the nested “Edit Representative” dialog still closes the parent Edit Company dialog and returns to the main Companies page. Delete now behaves correctly (returns to Edit Company), but Update Representative does not.

Current state in code:
- `src/components/companies/EditRepresentativeDialog.tsx` already has `modal={false}` and onSuccess only invalidates `['company-representatives']`.
- The app uses Radix Dialog (shadcn) with a custom `onInteractOutside` handler in `src/components/ui/dialog.tsx` intended to prevent parent dialogs from closing when interacting with nested dialogs.
- That handler currently checks for selectors like:
  - `[data-radix-dialog-content]`
  - `[data-radix-alert-dialog-content]`
  but Radix does NOT emit these attributes by default, and our wrappers do not add them.
</context>

<root-cause>
The parent “Edit Company” dialog is closing because Radix considers clicks inside the nested “Edit Representative” dialog to be an “outside interaction” relative to the parent dialog’s content (the nested dialog is portaled elsewhere in the DOM). The parent dialog therefore receives an outside-interaction event and closes.

We attempted to guard against this in `src/components/ui/dialog.tsx` by detecting whether the click target is inside another Radix dialog, but the detection currently fails because:
- `[data-radix-dialog-content]` and `[data-radix-alert-dialog-content]` do not exist anywhere in the DOM today (confirmed by searching node_modules and our wrappers).

So the parent dialog treats child-dialog clicks as outside clicks and closes, sending the user back to `/companies`.
</root-cause>

<solution-overview>
Make nested-dialog detection actually work by adding explicit “marker” data attributes to our dialog content wrappers, and keep the existing “prevent parent close when interacting with nested dialog” logic.

This is a robust, app-wide fix:
- It fixes Edit Representative closing the parent Edit Company dialog.
- It also hardens all nested dialog scenarios across the app (not just this page).
</solution-overview>

<implementation-steps>
1) Add a marker attribute to DialogContent so parent dialogs can detect “this click happened inside a dialog”
   - File: `src/components/ui/dialog.tsx`
   - Update the `DialogPrimitive.Content` wrapper to include a stable attribute, e.g.:
     - `data-radix-dialog-content=""` (or `data-lovable-dialog-content=""`)
   - Keep the current `onInteractOutside` handler, but ensure it checks for the attribute we actually set.

   Recommended approach (minimal change, leverages existing logic):
   - Add: `data-radix-dialog-content=""` to the content root
   - Leave this existing logic in place:
     ```ts
     target?.closest('[data-radix-dialog-content]')
     ```
   This makes the current prevention code finally become effective.

2) Add a marker attribute to AlertDialogContent for the same reason (completes the pattern)
   - File: `src/components/ui/alert-dialog.tsx`
   - Update `AlertDialogPrimitive.Content` wrapper to include:
     - `data-radix-alert-dialog-content=""`

3) Verify Edit Representative no longer closes Edit Company when saving
   - No changes needed in `src/components/companies/EditRepresentativeDialog.tsx` beyond what you already have (modal={false} is fine).
   - The key change is ensuring the parent dialog can correctly detect nested dialog interactions and not close.

4) (Optional hardening) Expand nested detection to cover other portaled overlays if you use them
   - Only if you still see edge cases:
     - Popover, Select, DropdownMenu content can also be portaled.
   - Add additional checks in `dialog.tsx` like:
     - `[data-radix-popover-content]`, `[data-radix-select-content]`, etc.
   - This is optional; the representative issue should be fixed by marking dialog/alert-dialog content.

</implementation-steps>

<files-to-change>
- `src/components/ui/dialog.tsx`
  - Add `data-radix-dialog-content` marker to `DialogPrimitive.Content`
  - Ensure `onInteractOutside` checks match that marker (it already does; it just needs the attribute to exist)

- `src/components/ui/alert-dialog.tsx`
  - Add `data-radix-alert-dialog-content` marker to `AlertDialogPrimitive.Content`
</files-to-change>

<test-plan>
Reproduce the exact workflow from your video:

1) Go to Companies → click Edit on any company
2) Switch to Representatives tab
3) Click Edit (pencil) on a representative
4) Change a field and click “Update Representative”
   Expected:
   - Toast: “Representative updated successfully”
   - Edit Representative dialog closes
   - You remain in Edit Company dialog on Representatives tab (no navigation back to main Companies page)

Regression checks:
5) Click Delete on a representative
   - Confirmation shows
   - After delete, you remain on Edit Company → Representatives tab
6) Click outside the Edit Company dialog
   - It should close only when you truly click outside (not when interacting with nested dialogs)

</test-plan>

<notes-why-this-works>
Radix determines “outside” based on whether the event target is inside the parent dialog’s content node. Since nested dialogs are portaled, they are outside in DOM terms, so the parent closes unless we explicitly prevent it.

By marking dialog content nodes with a known attribute and checking `target.closest(...)` inside `onInteractOutside`, we reliably detect nested dialog interactions and prevent the parent from closing.
</notes-why-this-works>
