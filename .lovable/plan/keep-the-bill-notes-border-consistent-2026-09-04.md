# Keep the Bill Notes border consistent

## Change
- Restore the note box to the thin border shown in the second screenshot.
- Remove the thick selected-state ring that makes the top, right, and bottom look overly bold.
- Keep the same complete border—including the left edge—whether the box is selected or not.
- Preserve the current light dialog styling, note scrolling, and Save/Cancel behavior.

## Verification
- Confirm the box looks identical before and after clicking inside it.
- Confirm the border is visible on all four sides and the app still builds successfully.

## Technical detail
- Limit the change to the Bill Notes textarea’s local classes; the shared textarea styling used elsewhere will not be changed.
