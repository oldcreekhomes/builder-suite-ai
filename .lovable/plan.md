## Goal
Reduce vertical space and tighten the layout of the Confirm PO dialog by consolidating the top metadata (Company, Bid Package Cost Code, Custom Message) onto a single row, and moving the recipient ("Sending To") info up next to Company so it's instantly visible.

## Proposed Layout

### New top row (replaces current two-column header + lower message/sending row)
A single 4-column grid above the Line Items table:

| Col 1 | Col 2 | Col 3 | Col 4 |
|---|---|---|---|
| **Company** + name<br/>**Sending To** name + email (stacked below) | **Bid Package Cost Code** + value | **Custom Message (Optional)** Textarea (rows=2) | (empty / spacer) |

This removes the lower `flex gap-3` row entirely. The Custom Message textarea moves UP into the header row, and the Sending To info stacks under Company so the user immediately sees "this PO is for X going to Y at email Z".

### Add Line button
Move the **+ Add Line** button next to the **Line Items** label (right-aligned in that label row), instead of being floated awkwardly at the bottom of the message row. This is a natural location and removes the strange `mt-6` floating button.

### Resend mode
The "Amount" block currently shown only in resend mode also moves into the consolidated row (replacing the Custom Message column position when there are no line items), keeping a single header pattern across both modes.

## Files to modify
- `src/components/bidding/ConfirmPODialog.tsx`

## Specific changes
1. Replace the existing `grid grid-cols-2 gap-4` header (lines 270-281) with a `grid grid-cols-12 gap-4` row containing:
   - Company + Sending To stacked (col-span-3)
   - Bid Package Cost Code (col-span-3)
   - Custom Message textarea (col-span-6)
2. Move the **+ Add Line** button into the `<Label>Line Items</Label>` row using `flex items-center justify-between`.
3. Delete the entire bottom `flex gap-3 items-start` block (lines 427-470).
4. Keep recipient empty-state styling (italic muted text) unchanged.
5. Keep the table itself untouched — column widths and alignment from prior iterations remain.

## Visual outcome
- Saves roughly one full row of vertical space (~80px).
- All identifying info (company, cost code, recipient) visible in one glance at the top.
- Custom Message sits inline with metadata rather than below the table.
- Add Line lives with the table it controls.

No data, queries, or business logic change — purely a layout consolidation.