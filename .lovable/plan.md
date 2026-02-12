
# Fix: A/P Aging Report Predecessor Payment Mapping

## Problem

The A/P Aging report for 126 Longview Drive shows **$25,891.39** instead of the correct **$23,833.43** shown on the Balance Sheet. The difference is $2,057.96 from payments on 7 corrected bills that are not being credited to the active replacement bills.

## Root Cause

The predecessor mapping code in `AccountsPayableContent.tsx` has two bugs:

1. **Line 159 is a no-op**: `const targetBillId = activeBillIds.includes(sourceId) ? sourceId : sourceId;` -- this always returns `sourceId` regardless of the condition, so predecessor payments are tracked under the old (reversed) bill ID, which doesn't exist in the active bills list.

2. **The `predecessorToActive` map (line 121) is never used**: It's built but never referenced when assigning payments to bills.

The net result: payments referencing old bill IDs ($2,057.96 total) are fetched but never applied to any active bill, so those bills show as fully unpaid.

## Fix

**File: `src/components/reports/AccountsPayableContent.tsx`**

Replace the broken predecessor mapping (lines 108-161) with logic that:

1. Fetches reversed bills with their `reference_number` (not just `id` and `reversed_by_id`)
2. Builds a map from old bill ID to active bill ID by matching `reference_number` (same proven approach used in the Account Detail Dialog fix)
3. Uses that map on line 159 to correctly route predecessor payments to their active successor bills

### Technical Changes

**Step 2 query** (line 113): Add `reference_number` to the select fields for reversed bills.

**After the query**: Build a `ref -> active bill ID` lookup from the active bills, then map each reversed bill ID to the active bill with the same reference_number.

**Step 4 payment routing** (line 159): Replace the no-op with: `const targetBillId = predecessorToActive[sourceId] || sourceId;`

This ensures that a payment on old bill "e385d597" (ref "GLHP-1230", $1,100) gets credited to active bill "c0facab1" (ref "GLHP-1230", $1,100), correctly reducing its open balance to $0 and removing it from the aging report.

## Why This Works on Other Projects

412/413 East Nelson has zero corrected bills, so the predecessor mapping code is never exercised. The bug only manifests when bills have been corrected (reversed and re-entered).

## Files to Edit

| File | Change |
|---|---|
| `src/components/reports/AccountsPayableContent.tsx` | Fix predecessor-to-active bill mapping using reference_number matching |
