

## Add Allocation Mode to Purchase Orders Tab

### What changes
Copy the "Allocation Mode" toggle (Full Amount vs Divide by N lots) from the Vendor Bid tab to the Purchase Orders tab, so multi-lot projects can divide PO amounts per lot.

### Implementation

**File: `src/components/budget/BudgetDetailsPurchaseOrderTab.tsx`**

1. Accept new props: `lotCount`, `isLocked`, and a callback `onAllocationChange` to pass the selected mode and computed amount back to the parent
2. Add `allocationMode` state (`'full' | 'per-lot'`), defaulting based on the current `budgetItem.unit_price` (same inference logic as Vendor Bid)
3. Compute `perLotAmount = Math.floor((totalAmount / lotCount) * 100) / 100` and `displayAmount` based on mode
4. Render the same Allocation Mode radio group (2-column grid with "Full amount" and "Divide by N lots") below the PO table when `lotCount > 1` and there are approved POs
5. Update the "Total Budget" footer to show "(per lot):" label when in per-lot mode, and show `displayAmount`

**File: `src/components/budget/BudgetDetailsModal.tsx`**

1. Pass `lotCount` and `isLocked` to `BudgetDetailsPurchaseOrderTab`
2. Add state for PO allocation mode and amount (via callback from the tab)
3. Update the `purchase-orders` case in `handleApply` to save `unit_price` and `quantity` based on the allocation mode — same pattern as vendor-bid: full amount sets `quantity=1, unit_price=totalPOAmount`; per-lot sets `quantity=1, unit_price=perLotAmount`
4. Pass `budgetItem` to the PO tab so it can infer the initial allocation mode from saved data

### Files changed
- `src/components/budget/BudgetDetailsPurchaseOrderTab.tsx`
- `src/components/budget/BudgetDetailsModal.tsx`

