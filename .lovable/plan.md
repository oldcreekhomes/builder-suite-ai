

# Fix: Accounts Payable Dialog - Duplicate Scrollbar, Wrong Total, Missing Filter

## Issues Found

### 1. Duplicate Scrollbars
Line 1077 of `AccountDetailDialog.tsx` sets `max-h-[85vh] overflow-y-auto` on the `DialogContent`. The Radix Dialog already renders inside a fixed-position container, and the inner `<div className="mt-4">` content creates a second scrollable area. Per the project's "single-scrollbar" pattern, the DialogContent should use `overflow-hidden` with the inner content area handling the scroll.

### 2. Wrong Total ($44,035.50)
Lines 1293-1297 calculate the summary by summing only **bill** transaction credits. This was fine before because "Hide Paid" removed paid bills AND their payments, leaving only unpaid bills whose credit sum equaled the outstanding balance. After the as-of-date fix, more bills correctly show as unpaid, but the payments made before Dec 31 also appear -- yet the total still only sums bill credits, ignoring payment debits. The correct total is simply the **last running balance** value, which already accounts for all debits and credits.

### 3. Consolidated Bill Payments Not Filtered by "Hide Paid"
Lines 1065-1067 filter `bill` and `bill_payment` types when Hide Paid is on, but `consolidated_bill_payment` is not included in the filter. This means consolidated payment rows leak through even when they should be hidden.

## Changes

### File: `src/components/accounting/AccountDetailDialog.tsx`

**Fix 1 - Scrollbar (line 1077):** Change `overflow-y-auto` to `overflow-hidden` on DialogContent, and wrap the table area in a scrollable container.

**Fix 2 - Total (lines 1293-1305):** Replace the bill-credits-only sum with the last value from the `balances` array (the final running balance), which correctly represents the net outstanding amount.

**Fix 3 - Filter (lines 1060-1071):** Add `consolidated_bill_payment` to the hidePaid filter so those payment rows are hidden when "Hide Paid" is toggled on.

### Summary of the fix:
- Scrollbar: single scroll area, no nesting
- Total: use final running balance instead of summing bill credits
- Filter: include `consolidated_bill_payment` in the Hide Paid check

