## Fix: Chronological lot order in Address tooltips (Review/Rejected/Approved/Paid)

**Problem:** Lot allocations in the Address column tooltip render in insertion order, so a row may show 17, 18, 19, 1, 2, 3... instead of 1...19.

**Files to change:**
1. `src/components/bills/BatchBillReviewTable.tsx` — `getLotAllocationData()` (~line 563)
2. `src/components/bills/BillsApprovalTable.tsx` — `getLotAllocationData()` (~line 678)
3. `src/components/bills/PayBillsTable.tsx` — `getLotAllocationData()` (~line 795)

**Change:** Add a `naturalLotKey` helper that extracts the leading number from the lot name and sort the lots array numerically (with `localeCompare` tiebreaker):

```ts
const naturalLotKey = (name: string) => {
  const m = name.match(/(\d+)/);
  return m ? parseInt(m[1], 10) : Number.MAX_SAFE_INTEGER;
};
// then: Array.from(lotMap.values()).sort((a, b) =>
//   naturalLotKey(a.name) - naturalLotKey(b.name) || a.name.localeCompare(b.name)
// )
```

This applies the same fix everywhere the Address tooltip is built, so Review, Rejected, Approved, and Paid all order lots 1, 2, 3... like Enter with AI.

**Will NOT touch:** descriptions/memo, quantity/unit cost spinners, grouping, PO matching, totals, or anything else.