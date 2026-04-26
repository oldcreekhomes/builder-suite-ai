# Edit Purchase Order Dialog Polish

Scoped to `src/components/CreatePurchaseOrderDialog.tsx` (Line Items table). No logic changes — purely visual cleanup of changes introduced in the previous lock update.

## 1. Rename "Qty" → "Quantity"
- `TableHead` for the qty column: change label from `Qty` to `Quantity`.
- Widen the column slightly (`w-[80px]` → `w-[100px]`) so "Quantity" fits without truncation.

## 2. Left-align Quantity, Unit Cost, and Amount
- Remove `text-right` from the three `TableHead` cells (Quantity, Unit Cost, Amount).
- Remove `text-right` / `justify-end` from the corresponding body cells:
  - Quantity input + locked div
  - Unit Cost input + locked div
  - Amount cell (`$x,xxx.xx`)
- Update Subtotal row: keep "Subtotal" label aligned with the new layout (left-align the amount cell to match Amount column).

## 3. Unify number font across Quantity / Unit Cost / Amount
- Amount cell currently uses: `text-sm font-medium` and renders `$x,xxx.xx`.
- Apply the same to the locked Quantity and Unit Cost displays so the row reads visually uniform:
  - Locked Quantity: `text-sm font-medium text-foreground` (drop `text-muted-foreground`), render `line.quantity` as plain integer/number.
  - Locked Unit Cost: `text-sm font-medium text-foreground`, render as `$x,xxx.xx` formatted with `toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })`.
- Editable inputs (unlocked POs) keep current `Input` styling — uniformity requirement applies to the locked, read-only display the user is looking at.

## 4. Use the standard red Lock icon
- Import `Lock` from `lucide-react` (already used app-wide per memory: "Red lock icons for read-only").
- In the Actions cell, when `isOriginalLine(idx)` is true, replace the disabled `Trash2` button with a `Lock` icon:
  ```tsx
  <Tooltip>
    <TooltipTrigger asChild>
      <span className="inline-flex h-7 w-7 items-center justify-center">
        <Lock className="h-3.5 w-3.5 text-destructive" />
      </span>
    </TooltipTrigger>
    <TooltipContent side="top">Locked — PO already sent to vendor</TooltipContent>
  </Tooltip>
  ```
- This matches the pattern used in `BudgetTableRow.tsx`, `AccountDetailDialog.tsx`, and other read-only states across the app.

## Files Modified
- `src/components/CreatePurchaseOrderDialog.tsx`

## Out of Scope
- No changes to lock trigger logic, email suppression, or data flow.
- No changes to other dialogs or pages.
