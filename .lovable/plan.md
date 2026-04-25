## Goal
Put **Company**, **Bid Package Cost Code**, and **Sending To** all on the same top row, and shrink the **Custom Message** column so it no longer dominates the dialog width.

## Current layout (ConfirmPODialog.tsx, lines 270–316)
A single 12-col grid:
- col-span-3: Company **with Sending To stacked underneath**
- col-span-3: Bid Package Cost Code
- col-span-6: Custom Message (Optional) — too wide

## Proposed new layout
Same 12-col grid, four columns instead of three:

| Cols | Content |
|------|---------|
| col-span-2 | **Company** + name |
| col-span-3 | **Bid Package Cost Code** + value |
| col-span-3 | **Sending To** — name + email (unboxed, stacked, same styling as today) |
| col-span-4 | **Custom Message (Optional)** Textarea (rows=2) |

This:
1. Promotes "Sending To" out from beneath Company into its own top-row column.
2. Reduces Custom Message from col-span-6 → col-span-4 (~33% narrower) so it stops looking oversized.
3. Keeps the existing empty-state ("No representatives with PO notifications enabled") and recipient styling intact — just relocated.

## Specific changes (`src/components/bidding/ConfirmPODialog.tsx`)
1. Change Company wrapper from `col-span-3` → `col-span-2` and **remove** the inner `<div className="mt-3">…Sending To…</div>` block (lines 274–295).
2. Keep Bid Package Cost Code as `col-span-3`.
3. Insert a **new** `col-span-3` block immediately after Cost Code containing the relocated "Sending To" label + recipients list (same markup that was nested under Company).
4. Change Custom Message wrapper from `col-span-6` → `col-span-4`.

No logic, data, or query changes — purely a layout reshuffle in one file.

## Visual outcome
Top row reads left-to-right: **Company | Cost Code | Sending To | Custom Message**, all aligned at the top, with Custom Message at a sensible ~⅓ width.
