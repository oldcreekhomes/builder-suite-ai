# Fix Oxford Apple charges and make every report detail row one line

## 1. Move the Oxford Apple charges to 4040 Office Supplies (data only)
- Move both Oxford Apple check lines ($27.65 and $27.66, 08/07/2026) from 8270 to 4040 - Office Supplies, in both the check lines and the matching journal lines.
- Confirm the entry still balances against the $55.31 bank payment. No code changes.

## 2. Make every report detail row the same single-line height
Cause: rows with the "..." actions button (JE / Approved rows) are taller than rows with the red lock, because the button is 32px tall inside a 32px row that also has cell padding.
- In every report detail window (Balance Sheet, Income Statement, Job Costs, A/P), make the actions button and the lock smaller (24px) and remove the vertical padding in the cells, so every row is exactly one line, the same height.
- Keep text truncated to one line, with the full text showing on hover.

## Technical details
- `src/components/ui/table-row-actions.tsx`: add a `compact` size (h-6 w-6).
- `AccountDetailDialog.tsx`, `JobCostActualDialog.tsx`, and the A/P detail rows: use `compact`, give cells `py-0`, rows a fixed `h-8`, and give text cells `truncate`.
