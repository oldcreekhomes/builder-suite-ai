## Match the PO Status Summary lots tooltip to the Manage Bills tooltip exactly

Two small changes in `src/components/bills/BillPOSummaryDialog.tsx`. No logic, no math, no other files.

### 1. Remove the dotted underline on the `+N` trigger

Today the `+N` cell uses `underline decoration-dotted underline-offset-2`. The Manage Bills `+N` trigger has no underline at all. Strip those classes (and `cursor-default`) so the trigger is plain text — matches screenshot 1.

### 2. Tooltip content uses the same JSX as Manage Bills

Replace the current per-lot tooltip body in `LotsCell` with the exact structure from `BillsApprovalTable.tsx` lines 1125–1145 (the `getLotAllocationData` popover):

```text
4200: Excavation, Backfill & Grading      ← cost code header (font-medium text-xs)
  Lot 1:        $475.00                    ← muted label, right-aligned amount
  Lot 2:        $475.00
─────────────────────────────────
Total:        $950.00                      ← border-t pt-1, font-medium
```

Concretely:
- Wrap content in `<div class="space-y-2">`.
- Render a single cost-code group (the row's own cost code from `getLineCostCodeDisplay(line)` or `match.cost_code_display`) as `<div class="font-medium text-xs">{costCode}</div>` followed by `<div class="pl-2 space-y-0.5">` containing each lot row: `<div class="flex justify-between gap-4 text-xs"><span class="text-muted-foreground">{lot.name}:</span><span>${amount}</span></div>`.
- Footer total: `<div class="border-t pt-1 flex justify-between gap-4 font-medium text-xs"><span>Total:</span><span>${groupTotal}</span></div>`.
- Use the same currency formatting as Manage Bills (`amount.toLocaleString('en-US', { minimumFractionDigits: 2 })` with `$` prefix) so the two tooltips are visually identical.
- Keep the `TooltipContent` with `className="max-w-xs"` to match.

Single-lot rows still show the lot name with no tooltip; zero-lot rows still show `—`. The `Lots` column header, the row grouping, and the table body otherwise remain unchanged.

### Verification

- Hover `+2` in the PO Status Summary on the Oxford City Concrete bill → popover shows `4200: Excavation, Backfill & Grading` header, `Lot 1: $475.00`, `Lot 2: $475.00`, divider, `Total: $950.00` — pixel-equivalent to the Manage Bills hover in screenshot 1.
- The `+2` trigger has no dotted underline.
- No native browser tooltip appears.
