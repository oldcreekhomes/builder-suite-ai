## Issue

In the PO Status Summary dialog, the **Cost Code** column shows `—` for "No PO" rows even when the bill line has a real cost code (e.g. Oxford bill 33456, second line "Optional - Dirt Removal" → cost code is `4200: Excavation, Backfill` but renders as `—`).

## Root cause

The dialog's `BillLine` type only reads `cost_code_display`, but the bill query (`BillsApprovalTable.tsx` line 281–305 and `BatchBillReviewTable`) actually returns the cost code as a joined relation: `cost_codes: { code, name }`. There is no step that flattens that into `cost_code_display`.

For matched rows it still renders correctly because of the `match.cost_code_display` fallback. For "No PO" rows there is no `match`, so the cell collapses to `—`.

## Fix (dialog only, presentation layer)

In `src/components/bills/BillPOSummaryDialog.tsx`:

1. Extend the local `BillLine` interface to include the optional joined relation:
   ```ts
   cost_codes?: { code?: string | null; name?: string | null } | null;
   ```

2. Update `getLineCostCodeDisplay(line)` so the resolution order becomes:
   - `line.cost_code_display`
   - `line.cost_codes` → format as `${code}: ${name}` (or just `code` if name missing)
   - matched PO's `cost_code_display`
   - empty string

3. Replace the two raw usages of `line.cost_code_display || '—'` (the No-PO row's Cost Code cell at line 330 and its `LotsCell` `costCode` prop at line 332) with `getLineCostCodeDisplay(line) || '—'`. Do the same for the matched row at lines 370 and 372 for consistency (`getLineCostCodeDisplay(line) || match.cost_code_display || '—'`).

No changes to matching logic, status badges, hooks, or other tables — purely a display/fallback fix in the dialog.

## Verification

- Oxford bill 33456: row 1 still shows `4200: Excavation, Backfill` → Matched. Row 2 now shows `4200: Excavation, Backfill` (instead of `—`) → No PO. Parent badge stays Partial.
- Bills where the bill line truly has no cost code still render `—`.
- Matched-only and Over-only bills are visually unchanged.