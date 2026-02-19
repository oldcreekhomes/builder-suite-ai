
## Three Focused Updates to the Bidding Table

### What Needs to Change

Based on the screenshot, there are three issues to fix:

**1. Cost Code column is too narrow** — "4400 - Exterior Trim / Cornice" and "4640 - Cabinet Installation" wrap to two lines because `w-40` (160px) is not enough. Increasing it by ~20% to `w-48` (192px) gives enough room for most cost code names to fit on one line. The cell also needs `whitespace-nowrap` to prevent wrapping.

**2. Specifications column content is left-aligned** — The "Add Specs" button and the paperclip icon are left-aligned (`justify-start`). They need to be centered (`justify-center`).

**3. Other columns need to shift right** — When Cost Code grows from `w-40` to `w-48`, all other columns naturally shift right together since the table uses auto layout. No other column widths need to change — they stay equal at `w-32` each (Status, Sent On, Due Date, Reminder Date, Specifications) and `w-40` for Files.

### Technical Changes

**File 1: `src/components/bidding/BiddingTableHeader.tsx`**
- Change `Cost Code` column: `w-40` → `w-48`
- All other column widths remain identical

**File 2: `src/components/bidding/components/BiddingTableRowContent.tsx`**
- Change the Cost Code `<TableCell>` width: `w-40` → `w-48`
- Add `whitespace-nowrap overflow-hidden` to prevent text wrapping in the cost code cell

**File 3: `src/components/bidding/components/BiddingTableRowSpecs.tsx`**
- Change `justify-start` → `justify-center` in the specs cell's wrapper div so both the paperclip icon and "Add Specs" text button are centered within the column

### Summary of Width Changes

| Column | Before | After |
|---|---|---|
| Checkbox | `w-10` | `w-10` (no change) |
| Cost Code | `w-40` | `w-48` (+8, ~20% wider) |
| Status | `w-32` | `w-32` (no change) |
| Sent On | `w-32` | `w-32` (no change) |
| Due Date | `w-32` | `w-32` (no change) |
| Reminder Date | `w-32` | `w-32` (no change) |
| Specifications | `w-32` | `w-32` (no change) |
| Files | `w-40` | `w-40` (no change) |
| Actions | `w-16` | `w-16` (no change) |

Only 3 files need to be edited, and all changes are minimal and targeted.
