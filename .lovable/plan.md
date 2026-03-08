

## Plan: Fix Credit Memo Display in Paid Tab

### Problem
1. Credit memos appear as **both** standalone rows AND child allocations in payment groups (duplicate)
2. Child credit rows lack green styling + CR badge
3. Child rows show bills before credits instead of credits first
4. Standalone credit row has memo/notes data that child rows don't display

### Root Cause
In `BillsApprovalTable.tsx` line 311, `paidBillIds` filters out credits (`b.total_amount >= 0`), so credit bills never get mapped into `billToPaymentMap`. They then render as standalone rows even though they appear as child allocations in payment groups.

### Changes (all in `src/components/bills/BillsApprovalTable.tsx`)

**1. Eliminate duplicate credit rows**
- After building `billToPaymentMap` from `paymentGroupsMap` (around line 1194-1199), also map credit allocation bill IDs into the map. Credits appear in `group.allocations` with `isCredit: true` — add those `billId`s to `billToPaymentMap` so they're skipped during standalone rendering.

**2. Show memo and notes on child rows**
- In the expanded child row rendering (line 1366-1488), look up the `childBill` object (already done at line 1367). Use it to:
  - Render the Memo cell with `getBillMemoSummary(childBill)` instead of an invisible placeholder
  - Render the Notes cell with the same notes button as standard rows instead of a placeholder

**3. Green styling + CR badge on credit child rows**
- In the child row Amount cell (line 1417-1434), when `alloc.isCredit`, apply `text-green-600 font-medium` class and append the CR badge (matching the standalone credit row styling at lines 830-835).

**4. Sort allocations: credits first**
- Before iterating `group.allocations` (line 1366), sort them so `isCredit: true` entries come before `isCredit: false` entries.

