

## Fix: Send Bid Package Must Respect Distance Filter

### The Problem
When you click "Send Bid Package," the system runs a fresh database query that pulls ALL companies linked to the bid package (line 61 of SendBidPackageModal.tsx: `WHERE bid_package_id = [id]`). It completely ignores the distance slider. So if you have 8 companies on the bid package and filter down to 3 using the slider, all 8 still receive the email.

### The Fix
Pass the filtered company IDs from the distance filter into the SendBidPackageModal so it only sends to companies visible on screen.

### Files Changed

**1. `src/components/bidding/BidPackageDetailsModal.tsx`**
- When the "Send" action is triggered, capture the current `distanceFilter.filteredCompanies` and extract their `company_id` values
- Pass these IDs up via a new callback (or store in state) so BiddingTableRow can forward them to SendBidPackageModal

**2. `src/components/bidding/BiddingTableRow.tsx`**
- Accept `filteredCompanyIds` from BidPackageDetailsModal
- Forward to SendBidPackageModal as a prop

**3. `src/components/bidding/SendBidPackageModal.tsx`**
- Accept an optional `filteredCompanyIds?: string[]` prop
- After fetching all companies from the database (lines 41-68), filter the results:
  ```
  const filtered = data.filter(bid => filteredCompanyIds.includes(bid.company_id))
  ```
- Only display and email the filtered subset
- The recipient count and "Send to X Recipients" button will reflect only the visible companies

### How It Works After the Fix
1. You open the bid package and set the distance to 40 miles -- 3 companies show
2. You click "Send Bid Package"
3. The modal receives those 3 company IDs
4. Only those 3 companies (and their reps) appear as recipients
5. Only those 3 get the email

### Additional Safety
- If no `filteredCompanyIds` prop is provided (e.g., sending from the main table row), it falls back to sending to all companies (current behavior)
- The modal will clearly show which companies will receive the email so the user can verify before clicking Send
