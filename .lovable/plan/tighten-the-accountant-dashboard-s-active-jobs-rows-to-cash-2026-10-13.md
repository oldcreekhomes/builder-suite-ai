# Tighten the accountant dashboard's Active Jobs rows to Cash Position density

## What changes

Only the Active Jobs table on the accountant dashboard. The Cash Position tab stays exactly as it is, and no columns, badges, dates, search, switches, or drag-to-reorder behavior change.

Row math, measured from your two screenshots:

```text
Active Jobs today:   28px manager initials circle + 16px cell padding = 44px per row
Cash Position now:   20px text + 8px cell padding                    = 32px per row  (target)
After the change:    24px manager initials circle + 8px cell padding  = 32px per row
```

So roughly a quarter less height per job, and more jobs visible without scrolling.

## Steps

1. **One home for row density.** Add a `table-compact` utility to the existing utilities block in the global stylesheet, declaring body/footer row height and cell padding in one place.
2. **Cash Position keeps its look, gains the shared definition.** The Cash Position card currently carries those same three declarations written inline; it will point at the shared utility instead. Same rules, so the tab renders pixel-for-pixel as it does today.
3. **Active Jobs goes compact.** The Active Jobs table opts into the shared density, the manager initials circle drops one size (28px to 24px), and the "In Design / Permitting / Under Construction" divider rows tighten to the same height. Column widths, the two-row Bills header, colored bill-count badges, date pickers, and the totals row are untouched.
4. **Check the work.** Run the build check, confirm the compact rules are present in the compiled stylesheet, and confirm no oversized row heights remain in the Active Jobs markup.
5. **Record the standard.** Note in the project's rules file and memory that default table rows stay at the current standard height, and dense tables opt into the single shared compact definition rather than each setting their own row heights.

## Technical details

- `src/index.css` — inside the existing `@layer utilities` block, add:

  ```css
  .table-compact tbody tr,
  .table-compact tfoot tr { height: 2rem; }
  .table-compact td { padding-top: 0.25rem; padding-bottom: 0.25rem; }
  ```

  These declarations are exactly what Cash Position already applies through its inline `[&_tbody_tr]:h-8 [&_tfoot_tr]:h-8 [&_td]:py-1` classes, so moving them into one utility changes nothing visually there.

- `src/components/owner-dashboard/CashPositionCard.tsx` — swap those three inline arbitrary variants for `table-compact` on the `<Table>` element. Nothing else in the component changes.

- `src/components/accountant-dashboard/AccountantJobsTable.tsx` — add `table-compact` to the `<Table>` className; manager initials badge `h-7 w-7` to `h-6 w-6`; status group cell `py-2` to `py-1`. The `<TableHead>` elements keep their current padding and the two-row header (rowSpan spans plus the Bills sub-header) is left alone, since it already sits tight. The empty-state row keeps its present padding.

- The owner dashboard's Active Jobs table is a separate component and is not part of this change; say the word if you want it matched later.

- Verification available here: build check plus a read of the compiled stylesheet and the updated markup. A signed-in visual pass is still not possible from this sandbox (the project uses an external Supabase that Lovable cannot mint a session for), so the last look at the live dashboard is yours.
