

## Fix Bidding Table Alignment and Remove Footer

### Problem
1. The bidding table is not vertically aligned with the top of the project dropdown and sidebar menu -- it needs to match the Files page alignment.
2. "Total Items: 2" text appears below the table and should be removed entirely.

### Changes

**1. `src/components/bidding/BiddingTabs.tsx` (line 39)**
- Change `px-6 pt-0 pb-6` to `px-6 pt-3 pb-6` to match the Files page content wrapper padding standard.

**2. `src/components/bidding/BiddingTable.tsx` (line 294)**
- Remove `space-y-4` from the wrapper div (change to just `relative`) since the toolbar is rendered in the header via the bridge pattern, not inline. This eliminates extra vertical gaps that push the table down.

**3. `src/components/bidding/BiddingTable.tsx` (line 438)**
- Remove the `<BiddingTableFooter biddingItems={biddingItems} />` line entirely.

**4. `src/components/bidding/BiddingTable.tsx` (line 14)**
- Remove the unused `BiddingTableFooter` import.

### Result
- The bidding table top border aligns with the project dropdown and sidebar menu, matching the Files page exactly.
- The "Total Items: 2" footer text is removed.

