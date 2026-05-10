## Goal
Eliminate horizontal scrolling in the PO Status Summary dialog so all columns (PO Number → Status) fit within the dialog width on a typical desktop viewport.

## Changes (single file: `src/components/bills/BillPOSummaryDialog.tsx`)

1. **Widen the dialog**
   - Change `DialogContent` from `max-w-6xl` → `max-w-[95vw]` (with `xl:max-w-7xl` floor) so it scales to the available viewport width instead of being capped at ~1152px.

2. **Abbreviate the Cost Code column**
   - Currently renders the full `cost_code_display` (e.g. `"4200: Excavation, Backfill & Grading"`), which is the widest non-description column.
   - Constrain it to `max-w-[140px]` with `truncate` and put the full cost code text in a `title` tooltip (same pattern already used by the Description column). User can hover to see the full name.

3. **Tighten Description column**
   - Reduce `max-w-[260px]` → `max-w-[220px]` to reclaim a bit more horizontal room for the numeric columns.

4. **Numeric columns stay `whitespace-nowrap`** — no change. PO Number, amounts, status badges remain fully visible.

## Out of scope
- No changes to data, totals math, or the single-PO shortcut path.
- No changes to other dialogs/tables.

## Technical notes
- Tailwind: `max-w-[95vw]` is supported via arbitrary values; existing dialogs in the codebase use the same pattern.
- Truncation pattern mirrors the existing Description cell (`max-w-[260px] truncate` + `title=`).
