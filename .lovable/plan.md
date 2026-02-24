

## Remove Distance Filter from Bidding Module

### What's changing

The distance-based filtering in the bid package detail view is being completely removed. Companies will now be filtered by **service area** (already implemented), not by driving distance. This will also fix the issue where "Kat & Mat Electrical Services" (and other companies) are hidden despite having active bids.

### Changes

**1. `src/components/bidding/BidPackageDetailsModal.tsx`**
- Remove the `useDistanceFilter` import and hook call
- Remove `distanceRadius` state
- Remove the `Slider` import
- Remove the "Distance" `<TableHead>` column and its `<TableCell>` (the slider cell)
- Pass `item.project_bids` directly to `BiddingCompanyList` instead of `distanceFilter.filteredCompanies`
- Remove `getDistanceForCompany` prop from `BiddingCompanyList`
- Update `onSendClick` to map company IDs directly from `item.project_bids` instead of `distanceFilter.filteredCompanies`
- Result: 7 columns remain (Status, Sent On, Due Date, Reminder, Specifications, Files, Actions)

**2. `src/components/bidding/BiddingCompanyList.tsx`**
- Remove the `DistanceResult` interface
- Remove the `getDistanceForCompany` prop from the interface and destructuring
- Remove passing `distanceInfo` to `BiddingCompanyRow`

**3. `src/components/bidding/components/BiddingCompanyRow.tsx`**
- Remove the `DistanceResult` interface
- Remove the `distanceInfo` prop from the interface and destructuring

**4. `src/hooks/useDistanceFilter.ts`**
- Keep the file (it may be used by the Marketplace module), but no bidding code will reference it anymore

### Why this fixes the missing companies

The distance filter was set to 75 miles with `enabled: true` (always on). Companies like "Kat & Mat Electrical Services" (located in Texas) exceeded the radius and were excluded from `filteredCompanies`, resulting in "No companies associated with this cost code." By removing the filter entirely and passing `item.project_bids` directly, ALL companies with bids in the package will appear.

### No other files affected

The `SendBidPackageModal` and `BiddingTableRow` will continue working -- they receive `filteredCompanyIds` from the `onSendClick` callback, which will now just pass all company IDs from `item.project_bids`.

