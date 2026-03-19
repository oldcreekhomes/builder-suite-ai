

## Enhanced Historical Pricing & Cost Code Breakdown in Bid Package Modal

### What We're Building

Replace the single-line historical banner with three distinct sections below the bid package header row:

**Section 1 — Historical Pricing** (only shows when a historical project is selected)
- Shows the historical project address and actual cost for this cost code
- Same data as today, just in a proper card section

**Section 2 — Percentage Adjuster** (always visible)
- An input field for a % value (default 100%)
- Displays the adjusted historical cost: `historicalCost × (percentage / 100)`
- If no historical project selected, shows the adjustment UI but with no base cost to adjust (greyed out or $0.00)

**Section 3 — Cost Code Breakdown** (always visible)
- Fetches subcategories of the current cost code from `cost_codes` table (where `parent_group = costCode.code`)
- Displays each subcategory: code, name, price, unit_of_measure (e.g., "4820.1 Gates — $450.00 Each", "4820.2 Fencing — $27.50 LF")
- If no subcategories exist, shows "No subcategories" message

### Layout

All three sections sit between the header controls row and the companies table, in a horizontal 3-column grid to "break up" the space:

```text
┌─────────────────────┬──────────────────────┬──────────────────────┐
│ § Historical        │ § % Adjuster         │ § Cost Code Breakdown│
│ 415 E Nelson        │ [  66  ] %           │ 4820.1 Gates  $450   │
│ $5,620.00           │ Adjusted: $3,709.20  │ 4820.2 Fencing $27.50│
│ (only if selected)  │                      │              LF      │
└─────────────────────┴──────────────────────┴──────────────────────┘
```

### Technical Approach

1. **New hook: `useCostCodeSubcategories(parentCode: string)`**
   - Queries `cost_codes` where `parent_group = parentCode`
   - Returns subcategories with code, name, price, unit_of_measure

2. **Update `BidPackageDetailsModal.tsx`**
   - Add `adjustmentPercent` state (default 100)
   - Replace the single historical banner with a 3-column grid of card sections
   - Section 1: conditional on `historicalProjectAddress`
   - Section 2: always visible, input for %, computed adjusted value from `historicalCost * percent / 100`
   - Section 3: always visible, uses `useCostCodeSubcategories(costCode.code)` to list subcategories

### Files to create/edit
- **Create** `src/hooks/useCostCodeSubcategories.ts` — new hook to fetch subcategories
- **Edit** `src/components/bidding/BidPackageDetailsModal.tsx` — replace banner with 3-section layout

