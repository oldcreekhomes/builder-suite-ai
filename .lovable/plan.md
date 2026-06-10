## Goal

Make the "All N lots" hover tooltip in the Edit Bill dialog match the canonical tooltip used on the Manage Bills table (Address column) — i.e. show **cost code header → lot name + amount per row → total**, instead of just the bare list of lot names it shows today.

## Files to change

1. `src/components/bills/EditBillDialog.tsx` — lines ~1071-1077 (tooltip content inside the grouped lots cell).
2. `src/components/bills/EditExtractedBillDialog.tsx` — lines ~1401-1407 (same tooltip pattern, in the extracted-bill review dialog).

## New tooltip content (both files)

Render this inside `<TooltipContent className="max-w-xs">` using data already on `group`:

- **Cost code header**: `group.account` (EditBillDialog) / `group.cost_code_display` (EditExtractedBillDialog).
- **Per-lot rows**: iterate `group.children`, showing `lotNameById(child.lotId | child.lot_id)` on the left and the child's amount on the right, formatted as `$X,XXX.XX` (2 fraction digits, `toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })`).
- **Total row**: bordered top, label `Total:` on the left and `$group.amount` formatted the same way on the right.

Structure mirrors `BillsApprovalTable.tsx` lines 1134–1153 so spacing, font sizes, borders, and currency formatting stay identical across the app.

## Out of scope

- No change to the trigger label ("All N lots") or to the non-grouped single-lot `<Select>` dropdown.
- No change to the PO Status badge tooltip or any other place.
- No data-shape, math, or backend changes.
