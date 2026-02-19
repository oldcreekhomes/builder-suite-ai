
## Two Changes to the Bidding Table

### Change 1: Remove the Eyeball Icon

In `src/components/bidding/components/BiddingTableRowContent.tsx` lines 96–103, there is a ghost `<Button>` with an `<Eye>` icon rendered next to the cost code name. This needs to be removed entirely. The cost code text itself already has `onClick={onRowClick}` on it, so click functionality is preserved.

**Current code (lines 89–104):**
```tsx
<div className="flex items-center justify-between">
  <div className="flex items-center cursor-pointer hover:text-primary flex-1" onClick={onRowClick}>
    {costCode?.code} - {costCode?.name}
  </div>
  <Button variant="ghost" size="sm" onClick={onRowClick} className="h-6 w-6 p-0 hover:bg-primary/10">
    <Eye className="h-3 w-3" />
  </Button>
</div>
```

**After (clean — just the text, no wrapper div needed):**
```tsx
<div className="cursor-pointer hover:text-primary" onClick={onRowClick}>
  {costCode?.code} - {costCode?.name}
</div>
```

The `Eye` import from `lucide-react` will also be removed since it will no longer be used.

### Change 2: Make Entire Row Clickable (Except Interactive Cells)

The `<TableRow>` in `BiddingTableRowContent.tsx` (line 81) gets an `onClick` handler that calls `onRowClick`. The interactive cells need `e.stopPropagation()` so their own interactions aren't swallowed by the row click.

**Row change:**
```tsx
<TableRow
  className={`${isSelected ? 'bg-blue-50' : ''} cursor-pointer`}
  onClick={onRowClick}
>
```

**Cells that need `stopPropagation`** (wrap their content in a `div` with `onClick={e => e.stopPropagation()}`):
- **Checkbox cell** — user clicks to select, not to open dialog
- **Status select cell** — has its own dropdown
- **Due Date cell** — `BiddingDatePicker`
- **Reminder Date cell** — `BiddingDatePicker`
- **Specifications cell** — `BiddingTableRowSpecs` opens its own modal
- **Files cell** — `BiddingTableRowFiles` has file upload/delete interactions
- **Actions cell** — `BiddingTableRowActions` has its own dropdown

The simplest approach: add `onClick={e => e.stopPropagation()}` as a `<div>` wrapper inside each of those `<TableCell>` elements, **or** pass the event through `TableCell` directly via `onClick`. The cleanest is:

```tsx
<TableCell onClick={e => e.stopPropagation()}>
  <Select ...>
```

This is done for every interactive cell (Status, Due Date, Reminder Date, Specs, Files, Actions). The Checkbox cell also gets it so checking a row doesn't simultaneously open the dialog.

### Change 3: Fix Column Spacing

Looking at the screenshot — the table is very unbalanced. Cost Code gets almost no width, Status is squeezed, Specifications/Files have too much space. The fix is to set explicit, sensible widths in `BiddingTableHeader.tsx`:

| Column | Current | New width |
|---|---|---|
| Checkbox | `w-12` | `w-10` |
| Cost Code | (none — auto) | `w-56` |
| Status | (none — auto) | `w-28` |
| Sent On | `w-32` | `w-28` |
| Due Date | `w-32` | `w-28` |
| Reminder Date | `w-32` | `w-28` |
| Specifications | (none — auto) | `w-24` |
| Files | (none — auto) | (flex remaining) |
| Actions | (none — centered) | `w-20 text-center` |

These proportions match the data — cost code names like "4430 - Roofing" need room, dates are fixed-width, specs/files are secondary.

The corresponding `<TableCell>` widths in `BiddingTableRowContent.tsx` are synced to match.

### Files to Change

| File | Change |
|---|---|
| `src/components/bidding/components/BiddingTableRowContent.tsx` | Remove Eye icon + button, add `onClick={onRowClick}` to `<TableRow>`, add `e.stopPropagation()` to all interactive cells |
| `src/components/bidding/BiddingTableHeader.tsx` | Update column widths for balanced layout |
