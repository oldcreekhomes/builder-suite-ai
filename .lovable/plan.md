Two fixes to `EditCheckDialog.tsx`:

**1. Per-row "Memo" column → "Description", repositioned**

In the Expense / Job Cost line-item grid:
- Rename the column header from `Memo` to `Description`.
- Rename the input `placeholder` from `Memo` to `Description`.
- Move the column so the order becomes: **Cost Code/Account · Amount · Address (when shown) · Description · Action**, matching the bill row layout the user shared.
- Re-balance the 20-col grid so column widths stay sensible:
  - Without address: Account 5 / Amount 3 / Description 8 / Action 4
  - With address: Account 5 / Amount 3 / Address 4 / Description 4 / Action 4
- Update the totals footer spans to match the new layout so the Amount total stays under the Amount column.

The top-level (header) `Memo` field on the check itself stays where it is — the user's complaint is about the per-row column.

**2. Top header row spacing (Date · Pay To · Check # · Bank Account)**

Currently uses `grid-cols-4` (four equal columns), so the narrow `DateInputPicker` leaves visible empty space before Pay To.

Change the responsive grid so Pay To consumes Date's leftover space and the gaps between all four fields are visually equal:
- `lg:` template: `grid-cols-[minmax(140px,180px)_2fr_1fr_1fr]` (Date sized to its picker, Pay To gets the extra room, Check # and Bank Account stay equal). Keep current mobile/tablet behavior.

No data, state, or save-logic changes.