

## Vendor Bid Per-Lot Allocation in Budget Details Modal

### The Problem
When a vendor bid (e.g., LCS at $20,382) covers the entire job but the project has 19 lots, the user needs to divide that amount evenly across lots. Currently, selecting a vendor bid applies the full amount to a single lot's budget row, with no way to split it.

### Proposed UX
When the user selects a vendor bid in the **Vendor Bid** tab of the Budget Details modal, and the project has multiple lots (>1), show an **allocation section** below the bid list:

1. **A "Per Lot" info row** appears when a bid is selected, showing:
   - The full bid amount (e.g., $20,382.00)
   - The number of lots (19)
   - The calculated per-lot amount ($20,382 / 19 = **$1,072.74 per lot**)
   - A note: "This bid covers the entire job. The amount will be divided equally across all 19 lots."

2. **The "Total Budget" footer** updates to show the **per-lot** amount (since the user is viewing a specific lot), not the full bid total.

3. **On Apply**: The system writes the per-lot amount (`bid.price / totalLots`) as the budget for the current lot's `project_budgets` row, and also creates/updates budget rows for all other lots with the same per-lot amount. Uses remainder-based arithmetic (last lot gets `total - (perLot * (n-1))`) to ensure the sum is exact.

### Technical Changes

**`src/components/budget/BudgetDetailsModal.tsx`**:
- Accept a new prop `lotCount` (number of lots in the project)
- When a vendor bid is selected and `lotCount > 1`, render an info box showing: full bid price, lot count, and per-lot calculation
- Update the Total Budget display to show per-lot amount
- Update `handleApply` to pass the per-lot amount and trigger multi-lot budget creation

**`src/hooks/useBudgetBidSelection.ts`**:
- Update the `selectBid` mutation to accept an optional `perLotAmount` and `lotIds` array
- When provided, upsert budget rows for all lots with the calculated per-lot amounts (using remainder arithmetic for the last lot)

**`src/pages/ProjectBudget.tsx`** (or wherever BudgetDetailsModal is opened):
- Pass the lot count from `useLots` to the modal

**`src/components/reports/JobCostBudgetDialog.tsx`**:
- Also pass lot count when opening BudgetDetailsModal

### UI Mockup
```text
┌─────────────────────────────────────────────┐
│ Budget Details                              │
│ 3180 - Sediment & Erosion Control           │
│                                             │
│ [Estimate] [Vendor Bid] [Manual]            │
│                                             │
│ ┌─────────────────────────────────────────┐ │
│ │ ☐  3180  Patriot Dev Co    $215,122.50  │ │
│ │ ☑  3180  LCS Site Svcs      $20,382.00  │ │
│ │ ☐  3180  Anderson Co        $36,800.00  │ │
│ │ ☐  3180  W.B. Hopke         $39,131.24  │ │
│ └─────────────────────────────────────────┘ │
│                                             │
│ ┌─ Per-Lot Allocation ──────────────────┐   │
│ │ Bid Total:     $20,382.00             │   │
│ │ Project Lots:  19                     │   │
│ │ Per Lot:       $1,072.74              │   │
│ │                                       │   │
│ │ This bid will be divided equally      │   │
│ │ across all 19 lots.                   │   │
│ └───────────────────────────────────────┘   │
│                                             │
│ Total Budget (per lot):  $1,072.74          │
│                                             │
│                        [Cancel] [Apply]     │
└─────────────────────────────────────────────┘
```

### Files to Change
1. `src/components/budget/BudgetDetailsModal.tsx` -- add lot count prop, per-lot info box, updated total display
2. `src/hooks/useBudgetBidSelection.ts` -- multi-lot upsert logic with remainder arithmetic
3. `src/pages/ProjectBudget.tsx` -- pass lot count to modal
4. `src/components/reports/JobCostBudgetDialog.tsx` -- pass lot count to modal

