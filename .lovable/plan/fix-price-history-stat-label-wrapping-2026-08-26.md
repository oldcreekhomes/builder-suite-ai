Fix Price History stat label wrapping

Problem
The statistics summary at the bottom of the Price History modal wraps label text (e.g. “Total Change” and “Annual Change” render on two lines) because the 6-column grid is too narrow for the labels.

Solution
Update `src/components/settings/PriceHistoryModal.tsx` so each stat label stays on a single line.

- Add `whitespace-nowrap` to each stat label.
- Adjust the grid layout from `grid-cols-6` to a width-friendly arrangement (e.g. `grid-cols-3` or a 2-row responsive layout) so labels are not forced to wrap while keeping all six stats visible.
- Preserve the existing values, colors, and helper text (`over X yrs`, `per year`).

Out of scope
No changes to price calculation, history sync, or chart behavior.
