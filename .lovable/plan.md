

## Add Allocation Mode Toggle for Vendor Bids

### Problem
Currently, when a vendor bid is selected on a multi-lot project, it always assumes per-lot division. The user needs the **option** to either:
1. **Full Amount** — Apply the entire bid to this specific lot only
2. **Divide by Lots** — Split the bid evenly across all lots

### Changes

**`src/components/budget/BudgetDetailsModal.tsx`**:
- Add a new state: `allocationMode` with values `'full'` or `'per-lot'`, defaulting to `'full'`
- Replace the current static "Per-Lot Allocation" info box (lines 486-501) with a **radio group** that lets the user choose:
  - **"Apply full amount to this lot"** — shows the full bid price
  - **"Divide equally across all {lotCount} lots"** — shows the per-lot breakdown (Bid Total, Lot Count, Per Lot amount)
- Update the `perLotAmount` calculation and footer total to respect the chosen mode
- Update `handleApply` (line 172-173): only pass `lotCount` and `bidTotal` to `selectBid` when `allocationMode === 'per-lot'`
- Only show the radio group when `hasMultipleLots && selectedBidId && selectedBidPrice > 0` (same condition as now)

### UI Mockup
```text
┌─ Allocation Mode ─────────────────────────┐
│ ○ Apply full amount to this lot           │
│     Budget: $20,382.00                    │
│                                           │
│ ● Divide equally across all 19 lots       │
│     Bid Total:    $20,382.00              │
│     Project Lots: 19                      │
│     Per Lot:      $1,072.73               │
└───────────────────────────────────────────┘

Total Budget (per lot):  $1,072.73
```

### Files to Change
1. `src/components/budget/BudgetDetailsModal.tsx` — add allocation mode radio, update total display and handleApply logic

