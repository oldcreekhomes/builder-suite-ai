

# Fix Multi-Lot Allocation Dialog Issues

## Overview

There are two issues with the multi-lot allocation workflow:

1. **Address column display**: Currently shows just "-" or lot name without the "+N" format and hover breakdown that shows per-lot amounts
2. **Stuck after submission**: After confirming allocation, the bills don't automatically move to the Review tab - user has to click submit again

## Issue 1: Address Column Missing Hover Breakdown

### Current State
The `BatchBillReviewTable` uses a simple `getLotDisplay()` function (lines 448-461) that:
- Returns "-" if no lots assigned
- Returns the lot name if one lot
- Returns "+N" for multiple lots (but with no amounts or hover)

### Solution
Update `BatchBillReviewTable.tsx` to use the same pattern as `BillsApprovalTable.tsx`:
- Add a proper `getLotAllocationData()` function that calculates per-lot amounts
- Add tooltip hover with cost code + lot breakdown
- Show the total at the bottom of the tooltip

### Changes to BatchBillReviewTable.tsx
```tsx
// Replace getLotDisplay with getLotAllocationData
const getLotAllocationData = (bill: PendingBill) => {
  if (!bill.lines || bill.lines.length === 0) {
    return { display: '-', breakdown: [], totalAmount: 0, uniqueLotCount: 0 };
  }
  
  // Group amounts by lot
  const lotMap = new Map<string, { name: string; amount: number }>();
  
  bill.lines.forEach(line => {
    if (line.lot_id && line.lot_name) {
      const existing = lotMap.get(line.lot_id);
      if (existing) {
        existing.amount += line.amount || 0;
      } else {
        lotMap.set(line.lot_id, { name: line.lot_name, amount: line.amount || 0 });
      }
    }
  });
  
  const breakdown = Array.from(lotMap.values());
  const totalAmount = bill.lines.reduce((sum, line) => sum + (line.amount || 0), 0);
  const uniqueLotCount = lotMap.size;
  
  if (uniqueLotCount === 0) return { display: '-', breakdown: [], totalAmount, uniqueLotCount: 0 };
  if (uniqueLotCount === 1) return { display: breakdown[0]?.name || '-', breakdown, totalAmount, uniqueLotCount: 1 };
  
  return { display: `+${uniqueLotCount}`, breakdown, totalAmount, uniqueLotCount };
};
```

Then update the Address cell rendering to show a tooltip with breakdown when there are multiple lots.

## Issue 2: Bills Not Moving to Review Tab

### Current State
After `handleAllocationConfirm` completes:
1. It updates the database with lot allocations
2. Refetches pending bills
3. Closes the dialog
4. **Stops there** - does NOT continue to submit

The user has to click "Submit Selected Bills" again, which works but is not intuitive.

### Solution
After the allocation is applied, automatically continue with the submission flow:
1. Refetch pending bills to get updated line data
2. Close the dialog
3. Call `handleSubmitAllBills` again - this time the lots are assigned, so it will proceed

### Changes to BillsApprovalTabs.tsx
```tsx
const handleAllocationConfirm = useCallback(async (allocations: LotAllocation[]) => {
  // ... existing allocation logic ...
  
  // Refresh bills data
  await refetchPendingBills();
  setShowLotAllocationDialog(false);
  setPendingAllocationData(null);
  
  // NEW: Automatically continue with submission
  // We need to re-trigger the submit flow after state updates
  // Use a flag to indicate we should continue
  setShouldContinueSubmit(true);
}, [...]);

// Add useEffect to continue submission after allocation
useEffect(() => {
  if (shouldContinueSubmit && !showLotAllocationDialog) {
    setShouldContinueSubmit(false);
    // Small delay to ensure batchBills state has updated
    setTimeout(() => {
      handleSubmitAllBills();
    }, 100);
  }
}, [shouldContinueSubmit, showLotAllocationDialog, handleSubmitAllBills]);
```

Alternatively, we can refactor to extract the actual submission logic into a separate function and call it directly after allocation completes.

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/bills/BatchBillReviewTable.tsx` | Replace `getLotDisplay` with `getLotAllocationData`, add tooltip with per-lot breakdown |
| `src/components/bills/BillsApprovalTabs.tsx` | After allocation confirm, automatically continue submission instead of stopping |

## Expected Behavior After Fix

1. **Enter with AI tab**: Address column shows "-" for unassigned bills
2. **User clicks Submit**: Dialog pops up with even split
3. **User confirms allocation**: 
   - Lines are updated/created in database
   - Bills immediately move to Review tab
4. **Review tab**: Address column shows:
   - "Lot 1" for single-lot bills
   - "+3" for multi-lot bills with hover showing per-lot amounts

