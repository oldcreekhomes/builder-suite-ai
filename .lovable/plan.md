Add a "View as entered" toggle button to the PO Status Summary dialog (`src/components/bills/BillPOSummaryDialog.tsx`).

## Behavior
- Default view stays exactly as it is now: grouped by cost code + description, with the "+N lots" hover cell. No changes to the grouped rendering.
- Add a small button in the dialog header area (next to the title/subtitle) labeled **"View as entered"**. When toggled on, it switches to a flat list — one row per `bill_line` in the exact order the bill was entered (sorted by `created_at` asc, then `id` asc as tiebreaker), matching the order shown on the Manage Bills line editor.
- When toggled on, the button label flips to **"View grouped"** so the user can switch back.
- In "as entered" mode:
  - One row per raw bill line (no cost-code/description grouping, no lot deduplication).
  - Lots cell shows the single lot for that line (or blank if none).
  - All other columns (Cost Code, Description, PO Amount, Billed to Date, This Bill, Remaining, Files, Status) render using the same cell components as today.
  - Totals row stays the same (sum of This Bill).

## Technical notes
- Add local state `viewMode: 'grouped' | 'entered'` inside `BillPOSummaryDialog`.
- Reuse the existing grouped-rows memo untouched. Add a second memo that returns raw lines sorted by `created_at`/`id`.
- Render conditionally based on `viewMode`. No changes to data fetching, hooks, or any other file.
