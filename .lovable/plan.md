
# Fix: Three-Way A/P Reconciliation (Balance Sheet vs Account Detail vs A/P Aging)

## Problem

Three views showing Accounts Payable for 126 Longview Drive as of 12/31/2025 display three different numbers:

| View | Amount | Status |
|---|---|---|
| Balance Sheet | $23,833.43 | Correct (journal-entry source of truth) |
| Account Detail Dialog | $25,891.39 | Wrong (+$2,057.96) |
| A/P Aging Report | $25,778.34 | Wrong (+$1,944.91, also missing $113.05 same-day bill) |

## Root Cause Analysis

Seven bills on this project were corrected (reversed and re-entered) on 12/08/2025. The original payment journal entries (totaling $2,057.96 in A/P debits) reference the OLD bill IDs. Those payments were later reversed on 01/21/2026. On the as-of date of 12/31/2025, those payments were still valid.

### Bug 1: Account Detail Dialog ($25,891.39)

The bills lookup query at line 340 uses `.is('reversed_at', null)`, which excludes the 7 reversed bills from `billsMap`. The defensive filter at line 500 then removes bill_payment journal entries because `billsMap.has(source_id)` returns false for reversed bill IDs. This drops $2,057.96 in valid payment entries from the display.

The `billsPaidBeforeAsOf` query (line 354) also uses `.is('reversed_at', null)`, which excludes payments that were reversed after the as-of date.

### Bug 2: A/P Aging Report ($25,778.34)

Two sub-issues:

1. **Orphaned payments not counted (-$2,057.96)**: The payment query (line 114) uses `.in('source_id', billIds)` where `billIds` are only active bills. Payments referencing reversed (predecessor) bill IDs are never found. Additionally, `.is('reversed_at', null)` on payment JEs excludes payments reversed after the as-of date.

2. **Same-day bill excluded (-$113.05)**: The aging bucket logic (line 207) starts at `aging >= 1`, excluding bills dated on the as-of date itself (aging = 0 days).

## Fix Plan

### File 1: `src/components/accounting/AccountDetailDialog.tsx`

**Change A** (line 340): Remove `.is('reversed_at', null)` from the bills lookup query. The bills lookup is for display enrichment only (vendor names, reference numbers). The journal entry query already handles which entries are valid. Keeping `.eq('is_reversal', false)` is sufficient.

**Change B** (line 354): Replace `.is('reversed_at', null)` with as-of-date-aware filtering: `.or('reversed_at.is.null,reversed_at.gt.${asOfDateStr}')`. This ensures payments valid on the as-of date are recognized for the isPaid determination.

### File 2: `src/components/reports/AccountsPayableContent.tsx`

**Change A** (lines 108-128): After getting active bill IDs, also query for predecessor (reversed) bill IDs using the `reverses_id` column on the bills table. This traces the correction chain: if a reversal bill has `reverses_id` pointing to an old bill, and that reversal bill's ID matches an active bill's `reversed_by_id`, we can map old payments to the active bill. Query payment JEs for BOTH active and predecessor bill IDs. Map predecessor payments to the active (corrected) bill in `paidAsOfDate`.

**Change B** (line 116): Replace `.is('reversed_at', null)` with as-of-date-aware filtering: `.or('reversed_at.is.null,reversed_at.gt.${asOfDateStr}')`.

**Change C** (line 207): Change `aging >= 1` to `aging >= 0` to include bills dated on the as-of date in the "1-30 Days" bucket (or create a "Current" row).

### File 3: `src/components/reports/BalanceSheetContent.tsx`

No changes needed -- already correct.

## Technical Detail: Predecessor Bill Chain for A/P Aging

```text
Step 1: Get active bills (reversed_by_id IS NULL, is_reversal = false)
Step 2: Query reversed bills for the project to build predecessor map:
        SELECT id, reversed_by_id FROM bills 
        WHERE project_id = X AND reversed_by_id IS NOT NULL AND is_reversal = false
Step 3: Build map: old_bill_id -> active_bill_id
        (via matching: active bill whose ID chain links back to old bill)
Step 4: Query payment JEs for both active AND predecessor bill IDs
Step 5: For each payment referencing a predecessor bill, credit it to the active bill
```

## Expected Result After Fix

All three views will show $23,833.43 for A/P as of 12/31/2025 on 126 Longview Drive.
