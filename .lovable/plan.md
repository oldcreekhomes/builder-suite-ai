

## Fix: Show "Will Bid" intent + Submitted indicator

### Problem
When a subcontractor confirms "Will Bid" and later submits their bid, the `bid_status` changes to `submitted`, causing the "Will Bid" dropdown to show `---`. This makes it look like they never responded.

### Solution
1. Include `will_bid_at` in the data flow to the company row
2. Derive the dropdown value from `will_bid_at` (not just `bid_status`) — if set, show "Yes"
3. Add a small green checkmark icon next to the dropdown when `bid_status === 'submitted'` to indicate the bid was received

### Files changed

**`src/components/bidding/components/BiddingCompanyRow.tsx`**
- Add `will_bid_at: string | null` to the `BiddingCompany` interface
- Change Select value logic: if `will_bid_at` is set → `"will_bid"`, else use `bid_status`
- Add a `CheckCircle` icon (green, small) next to the Select when `bid_status === 'submitted'`

**`src/components/bidding/BiddingCompanyList.tsx`**
- Add `will_bid_at: string | null` to the `BiddingCompany` interface

**`src/hooks/useBiddingData.ts`**
- Verify `will_bid_at` is included in the `project_bids` select (it uses `*` so it should already be included, just needs the TypeScript interface updated)

