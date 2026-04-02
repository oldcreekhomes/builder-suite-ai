

## Fix: Sort Bid Packages by Cost Code Within Groups

### Problem
The `filteredGroupedBiddingItems` memo in `BiddingTable.tsx` groups items and sorts the groups numerically, but does **not** sort items within each group by cost code. The sorting that exists in `useBiddingData.ts` is bypassed because `BiddingTable` re-groups from `filteredBiddingItems` independently.

This affects all three tabs (Draft, Bidding, Closed) — the screenshot just makes it most visible in Closed because it has 15 items.

### Fix
In `src/components/bidding/BiddingTable.tsx`, add a sort step inside the `filteredGroupedBiddingItems` memo — after grouping and before returning, sort each group's items by cost code numerically (matching the existing sort logic in `useBiddingData.ts`).

### Technical detail
Add after line 121 (after pushing items into groups), before the group sort:

```typescript
Object.values(grouped).forEach(items => {
  items.sort((a, b) => {
    const numA = parseFloat(a.cost_codes?.code || '0');
    const numB = parseFloat(b.cost_codes?.code || '0');
    return numA - numB;
  });
});
```

### Files changed
- `src/components/bidding/BiddingTable.tsx`

