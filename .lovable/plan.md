Keep all Price History stat titles in a single row by widening the dialog

Problem
The previous fix moved the statistics summary into a 2-row layout. The user wants all six stat labels (Current Price, Min Price, Max Price, Price Change, Total Change, Annual Change) on a single horizontal row.

Solution
Update `src/components/settings/PriceHistoryModal.tsx`:

- Increase the dialog width from `max-w-2xl` to a larger size (e.g. `max-w-4xl` or `max-w-[900px]`) so a 6-column summary has room.
- Restore the statistics grid to a single row (`grid-cols-6`).
- Keep `whitespace-nowrap` on each stat label so each title stays on one line.
- Preserve existing values, colors, helper text, and chart behavior.
