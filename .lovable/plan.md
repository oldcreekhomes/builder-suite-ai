

## Add Historical Pricing to Bidding Module

### Overview

Add a historical project dropdown to the main Bidding page header. When a historical project is selected, show historical actual costs inside each bid package's details modal — giving the PM a reference price for that cost code from a past job.

### UX Flow

1. **Main Bidding page**: A "Historical" dropdown appears in the header area (next to "Global Settings" / "Load Bid Packages" buttons). It uses the same `useHistoricalProjects` hook and dropdown pattern as the Budget page — select a past project once, it persists across all bid packages.

2. **Bid Package Details Modal** (e.g. "4770 - Driveway"): When a historical project is selected, a small info card/banner appears below the bid package management table and above the companies list showing:
   - The historical project name (street address)
   - The historical actual cost for this specific cost code (e.g. "$12,500")
   - If no historical cost exists for this cost code, show "No historical data for this cost code"

This gives the PM instant context when reviewing vendor bids — they can see what they paid last time.

### Changes

**1. `src/components/bidding/BiddingTabs.tsx`**
- Add `selectedHistoricalProjectId` state, pass it down to `BiddingTable`.

**2. `src/components/bidding/BiddingTable.tsx`**
- Accept `selectedHistoricalProjectId` and `onHistoricalProjectChange` props.
- Render the historical project dropdown in the header actions area (alongside Global Settings / Load Bid Packages buttons).
- Use `useHistoricalActualCosts(selectedHistoricalProjectId)` to fetch the cost map once.
- Pass `historicalCost` (looked up by each bid package's cost code) into `BiddingTableRow` and through to the details modal.

**3. `src/components/bidding/BiddingTableHeader.tsx`**
- No changes needed — historical pricing shows inside the modal, not as a table column.

**4. `src/components/bidding/BidPackageDetailsModal.tsx`**
- Accept optional `historicalProjectAddress` and `historicalCost` props.
- When `historicalCost` is defined, render a compact info banner between the bid package table and the companies section:
  ```
  ┌─────────────────────────────────────────────┐
  │ 📊 Historical: [Project Address] — $12,500  │
  └─────────────────────────────────────────────┘
  ```
- Uses muted background styling consistent with existing cards.

### Existing hooks reused (no new queries)
- `useHistoricalProjects()` — fetches project list for dropdown
- `useHistoricalActualCosts(projectId)` — fetches cost-code-to-amount map for selected project

### Files modified
- `src/components/bidding/BiddingTabs.tsx` — add state
- `src/components/bidding/BiddingTable.tsx` — add dropdown + pass data
- `src/components/bidding/BidPackageDetailsModal.tsx` — show historical cost banner

