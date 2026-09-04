# Make all Bill Notes readable (scrollable)

## Problem
In the Bill Notes dialog (e.g. Prince William Garage Door), "Previous notes" are cut off — the third note (Raymond Zins) is clipped and you can't scroll to see the rest. The `ScrollArea` in `BillNotesDialog.tsx` only has `max-h-[200px]`, which doesn't give Radix ScrollArea a real bounded height, so it never scrolls and notes get clipped behind the dialog footer.

## Fix
UI-only change in `src/components/bills/BillNotesDialog.tsx`:

1. Give the Previous notes `ScrollArea` a fixed height (e.g. `h-[240px]`) instead of just `max-h-[200px]`, so overflowing notes actually scroll.
2. Cap the whole dialog content height (`max-h-[85vh]` with internal scrolling) so the Cancel/Save buttons stay visible even with many notes.
3. Verify in the preview that all notes are reachable by scrolling and the footer buttons remain visible.

No data or note-saving logic changes.
