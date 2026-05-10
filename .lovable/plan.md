## PO Status Summary — collapse lots into a hover column (Option B)

### Goal

Keep the PO Status Summary dialog readable regardless of how many lots a single bill spans. Today, a bill split across N lots produces N near-duplicate rows per cost code. After this change, each unique PO line shows once, with a new **Lots** column that displays a count and reveals per-lot dollars on hover — matching the existing pattern on the Manage Bills list (the "+2" / 4200 / 4275 popover).

Scope is limited to `src/components/bills/BillPOSummaryDialog.tsx`. No business-logic, math, or schema changes.

### What changes for the user

Before (today, 2 lots → 8 rows of mostly duplicates):

```text
PO Number       Cost Code   Description                  This Bill   …
2026-103E-0016  4200        Backfill                     $475
2026-103E-0016  4200        Backfill                     $475
2026-103E-0013  4275        Interior Concrete - Slab     $5,900
2026-103E-0013  4275        Exterior Draintile           $800
2026-103E-0013  4275        *Optional - Window Well      $1,200
2026-103E-0013  4275        Interior Concrete - Slab     $5,900
2026-103E-0013  4275        Exterior Draintile           $800
2026-103E-0013  4275        *Optional - Window Well      $1,200
```

After:

```text
PO Number       Cost Code   Description                  Lots   This Bill   …
2026-103E-0016  4200        Backfill                     +2     $950
2026-103E-0013  4275        Interior Concrete - Slab     +2     $11,800
2026-103E-0013  4275        Exterior Draintile           +2     $1,600
2026-103E-0013  4275        *Optional - Window Well      +2     $2,400
```

Hovering the **Lots** cell opens a shadcn tooltip (no native HTML title) showing:

```text
Lot 1:        $5,900.00
Lot 2:        $5,900.00
Total:       $11,800.00
```

When a row has only one lot, the cell shows the lot name directly (e.g. `Lot 3`) — same convention as the Manage Bills list.
When a row has no lot allocation, the cell shows `—` and no tooltip.

### Implementation outline

1. **Group bill_lines by PO line identity** before rendering. The grouping key is the tuple `(resolvedPoId, purchase_order_line_id ?? cost_code_id, memo)`. This collapses lot duplicates while keeping genuinely different cost-code/description rows separate.
2. For each group, sum `amount` for the **This Bill** column and collect a `lots` array of `{ name, amount }` from `line.project_lots` (lot_name, falling back to `Lot {lot_number}`), using the same natural sort as `getLotAllocationData` in `BillsApprovalTable.tsx`.
3. **Add a "Lots" column** between Description and PO Amount.
   - 0 lots → render `—`, no tooltip.
   - 1 lot → render the lot name, no tooltip.
   - 2+ lots → render `+N` wrapped in shadcn `Tooltip` / `TooltipTrigger` / `TooltipContent` (provider already exists on the dialog), showing each lot + Total formatted with `formatCurrency`.
4. **Sort** the collapsed groups by leading cost-code number (preserving today's sort behavior added in the prior fix).
5. **Footer total** continues to sum every original `bill_line.amount` (unchanged math, just a different grouping for display).
6. **No native `title` attributes** — anywhere a tooltip is needed, use the existing shadcn `TruncatedCell` / `Tooltip` components.

### Out of scope

- The `PODetailsDialog` shortcut path (single-PO bills) is unchanged.
- PO-level columns (PO Amount, Billed to Date, Remaining, Status, Files) continue to render on every row for now. Deduplicating those across rows of the same PO can be a follow-up if desired — flagging only because they visually repeat; no change in this pass.
- No edits to data fetching, RLS, hooks, or the bills list.

### Verification

- Open the City Concrete bill at Oxford (the screenshot case): 8 rows should collapse to 4, Lots column shows `+2` on each, hover reveals Lot 1 / Lot 2 / Total in shadcn tooltip.
- Open a single-lot bill: Lots column shows the lot name, no hover.
- Open a bill with no lot allocation: Lots column shows `—`.
- Footer Total equals the bill total (unchanged).
- No native gray browser tooltip appears anywhere in the dialog.
