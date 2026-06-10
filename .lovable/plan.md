## Goal
Make Quantity and Unit Cost inputs in the Edit Bill dialog behave like normal text fields (type freely, delete works, cursor moves naturally), display every value to two decimal places consistently, and confirm the "÷" divide-across-lots flow keeps a single conceptual line with the last lot absorbing the rounding remainder.

## Problem

In `src/components/bills/EditBillDialog.tsx` (and the same pattern in `EditExtractedBillDialog.tsx`):

1. Quantity/Unit Cost inputs in the Job Cost table render their value from a number that is **re-formatted with `.toFixed(2)` on every keystroke** for grouped rows, and from a raw string for single rows. That's why some cells show `1` and others show `1.00`, and why typing/deleting feels weird — React rewrites the value while you type.

2. The grouped rendering path (`group.quantity.toFixed(2)`, `group.unitCost.toFixed(2)`) means the displayed value can never be `1` or `600`; but the single-row path (`singleRow.quantity`) shows whatever raw string is in state, so the column looks inconsistent.

3. The divide ("÷") button already puts the rounding remainder on the **last lot** (`splitJobCostRowEvenly` in `EditBillDialog.tsx` lines 258–299) and the tooltip already lists all lots with a Total row — no logic change needed there. But the inputs going through `.toFixed(2)` formatting mid-typing made it feel like edits were being fought.

## Fix

### 1. Editable inputs (Job Cost — Quantity & Unit Cost)

Switch both columns to a small uncontrolled-on-focus pattern so React never overwrites what the user is typing:

- Keep the underlying state as today (string for single rows, numeric on group).
- Add a per-cell local edit buffer (`useState<Record<string,string>>`) keyed by `groupKey + field`.
- While the input is **focused**, render `editBuffer[key]` verbatim (no formatting). On every keystroke, update only the buffer.
- On **blur**, parse the buffer to a number, write it back through `updateJobCostRow` / `updateJobCostGroup` (the existing handlers), then clear that buffer entry so the cell falls back to the formatted display value.
- When **not focused**, render the value with `Number(v).toFixed(2)` so every quantity and unit cost shows two decimal places consistently (`1.00`, `600.00`).

Apply identically to:
- Job Cost Quantity input (around lines 1011–1028)
- Job Cost Unit Cost input (around lines 1029–1046)
- The same two inputs in `EditExtractedBillDialog.tsx`

Keep `type="number"`, `step="0.01"`, `readOnly={isApprovedBill}`, and the existing styling.

### 2. Divide across lots (no second line item, last lot rounds)

- Leave `splitJobCostRowEvenly` as-is — it already creates one `bill_lines` row per lot (which the table re-groups into a single visual row showing "All N lots") and the **last lot** receives the cent-precise remainder via `remainder = totalValue - perLotAmount * (lots.length - 1)`.
- Leave the grouped tooltip as-is — it already lists every lot with its individual amount plus a Total row (lines 1071–1089), so the user can see which lot absorbed the remainder.

No backend, schema, or math changes. No change to the Expense tab. No change to the PO Status badge, the actions dropdown row-click fix, or the address-tooltip standardization from the previous turn.

## Files touched
- `src/components/bills/EditBillDialog.tsx` — Quantity & Unit Cost inputs only.
- `src/components/bills/EditExtractedBillDialog.tsx` — same two inputs, same pattern.

## Out of scope
- Persistence/save logic (`saveLinesForPO`, `bill_lines` writes) — already converts strings via `parseFloat` on save.
- Single-row vs grouped data model — unchanged.
- Anything in `LotAllocationDialog.tsx` or `split-bill-lines-by-lot` edge function.
