# Fix Bill Notes textarea left border

## Goal
Make the left edge of the "Add a note" textarea in `BillNotesDialog.tsx` visually match the top, right, and bottom borders (dark/black), instead of appearing lighter or missing.

## Investigation
- Inspect `src/components/ui/textarea.tsx` for default border/ring/padding classes.
- Inspect `src/components/bills/BillNotesDialog.tsx` for any wrapper or class overriding the left side of the textarea.
- Determine whether the issue is a missing `border-l`, a `ring`, `focus-visible` offset, or a parent `bg`/`overflow` masking the left edge.

## Implementation
- Apply a minimal, targeted CSS fix in `BillNotesDialog.tsx` (or `textarea.tsx` if it affects all textareas) so the textarea has a consistent border on all four sides in its default and focused states.
- Keep the dialog's light theme and existing scroll/footer behavior unchanged.

## Verification
- Run `bun run build:dev` (or typecheck if available) to confirm no compile errors.
- Verify in the preview that the textarea in Bill Notes has an even border on all sides.
