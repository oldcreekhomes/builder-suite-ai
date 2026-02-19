
## Fix: Price Update No Longer Overwrites "Will Bid" Status

### Root Cause

In `src/hooks/useBiddingCompanyMutations.ts`, the `updatePriceMutation` (lines 128–169) contains this logic:

```ts
const updateData: { price: number | null; bid_status?: string; bid_acknowledged_by?: null } = { 
  price,
  bid_acknowledged_by: null // Reset acknowledgment so PM sees the update
};
if (price !== null && price > 0) {
  updateData.bid_status = 'submitted';  // <-- THIS IS THE PROBLEM
}
```

When a PM manually types a price, the mutation **unconditionally overwrites `bid_status` to `'submitted'`**, which erases the existing `will_bid` status entirely. That's why the "Will Bid: Yes" column went blank — the status got changed from `will_bid` to `submitted`, and the Will Bid column only shows for `will_bid` status.

### The Fix

The `updatePriceMutation` should **only set `bid_status = 'submitted'` if the current status is NOT already `will_bid`**. Since the mutation currently doesn't fetch the current status before updating, the cleanest fix is to:

**Option A (preferred — no extra DB call):** Remove the automatic `bid_status` override entirely from the PM-side price update. The PM is manually entering a price for tracking purposes — this is different from a subcontractor submitting a bid through the portal (which is handled by the `submit-bid` edge function). The PM updating a price should never change the workflow status.

**Option B:** Fetch the current `bid_status` before updating, and only set `'submitted'` if the current status is `null` or `'will_not_bid'`.

Option A is simpler, safer, and correct for this workflow. The `submit-bid` edge function (which subcontractors use) still correctly sets `bid_status = 'submitted'`, so that path is unaffected.

### The Change

**File: `src/hooks/useBiddingCompanyMutations.ts`**

Remove the automatic `bid_status = 'submitted'` override from the `updatePriceMutation`. The update should only touch `price` and `bid_acknowledged_by`:

**Before (lines 134–140):**
```ts
const updateData: { price: number | null; bid_status?: string; bid_acknowledged_by?: null } = { 
  price,
  bid_acknowledged_by: null
};
if (price !== null && price > 0) {
  updateData.bid_status = 'submitted';
}
```

**After:**
```ts
const updateData = { 
  price,
  bid_acknowledged_by: null
};
```

### Impact

- "Will Bid: Yes" stays intact when a PM manually updates a price — no more disappearing status.
- The `bid_acknowledged_by: null` reset is preserved, so the PM notification for updated bids still works.
- The `submit-bid` edge function is untouched — subcontractors submitting through the portal still correctly set status to `submitted`.
- Only 1 file, 5 lines changed.
