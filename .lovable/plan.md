
## Fix: A/P Aging Report Excludes Credit Memos

### Root Cause
The A/P Aging report in `AccountsPayableContent.tsx` filters bills with `openBalance > 0.01` (line 198-201). Credit memos have negative `total_amount` values (e.g., -$500 for the JZ Structural credit OCH-02302), so their open balance is negative and they get excluded. This causes a $500 discrepancy vs. the Balance Sheet which correctly includes the credit via journal entries.

### The Numbers (As of Oct 31, 2025)
- Balance Sheet A/P: $12,151.13 (correct -- includes the -$500 credit)
- A/P Aging Total: $12,651.13 (wrong -- missing the credit)
- Difference: exactly $500

### Fix

**File: `src/components/reports/AccountsPayableContent.tsx`**

1. **Line 198-201**: Change the open balance filter from `openBalance > 0.01` to `Math.abs(openBalance) > 0.01`. This includes credit memos (negative open balances) in the report.

Credits will naturally:
- Appear in the appropriate aging bucket based on their bill date
- Display with negative (parenthesized) amounts
- Reduce the bucket subtotals and grand total to match the Balance Sheet

This is a one-line fix. No changes needed to the Balance Sheet, Account Detail dialog, or PDF export -- they all already handle negative amounts correctly.
