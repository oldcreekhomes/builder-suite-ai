Fix PO Status Summary lot display in `src/components/bills/BillPOSummaryDialog.tsx` only. Do not touch match/allocation math or any other column.

## Problems
1. "+20" shown on a 19-lot bill. The bill's remainder-cent line (Lot 1: $0.03) is a separate DB row also tagged `lot_id = Lot 1`, and grouping pushes every row into `g.lots` as-is, so Lot 1 appears twice → count = 20.
2. Hover on "+20" shows `Lot 1: $798.95` and `Lot 1: $0.03` as two rows — same root cause.
3. Hover on "Lot 19" shows nothing because `LotsCell` renders a plain `<span>` when `lots.length === 1`.

## Fix
In `BillPOSummaryDialog.tsx`:

1. After the `billLines.forEach` grouping pass, collapse `g.lots` by lot name — sum amounts for identical names. Lot 1 $798.95 + Lot 1 $0.03 becomes Lot 1 $798.98. Count becomes 19.
2. Keep the existing natural sort on the collapsed lots.
3. In `LotsCell`, when `lots.length === 1` render the same tooltip breakdown used for multi-lot (trigger = lot name, content = cost code + single lot row + total). Multi-lot behavior unchanged (trigger `+N`).

## Not changing
- PO Amount, Billed to Date, This Bill, Remaining, Status columns and their math.
- PO resolution (`resolveLineToPoId`), attribution, sort order of groups.
- How bill lines are stored or split at write time.
