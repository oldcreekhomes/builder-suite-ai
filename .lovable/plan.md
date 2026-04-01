

## Fix: Account Column Not Populating for Bill Payments in Reconciliation

### Problem
The Account column in the reconciliation table shows "-" for both **legacy bill payments** (per-JE-line) and **consolidated bill payments**. Only checks properly populate this column because they fetch both `allocations` (cost codes) and `accountAllocations` (chart of accounts) from their respective line items.

### Root Cause
In `useBankReconciliation.ts`:
- **Legacy bill payments** (lines 328-339): No allocation data is fetched at all — the transaction is built with no `allocations` or `accountAllocations` fields
- **Consolidated bill payments** (lines 454-522): Fetch cost code allocations but NOT account (chart of accounts) allocations from `bill_lines`

### Fix

**File: `src/hooks/useBankReconciliation.ts`**

#### 1. Add account allocations for legacy bill payments (per-JE-line)
After building `billPaymentTransactions` (around line 341), add a new section that:
- Collects all `sourceBillId` values from `billPaymentTransactions`
- Fetches `bill_lines` for those bills with both `cost_codes` and `accounts` joins (same pattern as consolidated payments at line 458)
- Groups by bill_id, then maps allocations onto each transaction using `sourceBillId`
- Sets both `allocations` (cost codes) and `accountAllocations` (chart of accounts) on each bill payment transaction

#### 2. Add account allocations for consolidated bill payments
After the existing cost code allocation fetch (around line 524), add a similar fetch for account-based allocations:
- Query `bill_lines` for the same bill IDs but join on `accounts:account_id (code, name)` instead of `cost_codes`
- Group by consolidated payment and set `accountAllocations` on each transaction

This mirrors exactly how checks fetch both `checkAllocationsMap` (cost codes, line 707) and `checkAccountAllocationsMap` (accounts, line 767).

### Technical Details
- `bill_lines` table has both `cost_code_id` and `account_id` columns
- The `AllocationCell` component in ReconcileAccountsContent.tsx already handles the display logic: it prefers `accountAllocations` over `allocations`, falling back to cost codes
- No UI changes needed — the Account column rendering already works correctly, it just needs the data

### Files Changed
- `src/hooks/useBankReconciliation.ts` — fetch and attach allocations for both bill payment types

