

## Fix: Paid Tab Crash — Missing Guard for Undefined Breakdown

### Problem
On line 852-854 of `BillsApprovalTable.tsx`, when a paid bill has no payment breakdown data (or no credits), the guard block is empty — it has no `return` statement. Execution falls through to line 860 which accesses `breakdown.cashPaid`, crashing with "Cannot read properties of undefined (reading 'cashPaid')".

### Fix: `src/components/bills/BillsApprovalTable.tsx`

On lines 853-854, add a return statement inside the empty guard block so that when `breakdown` is undefined or has no credits, it renders the plain amount without the tooltip:

```tsx
if (!breakdown || breakdown.credits.length === 0) {
  return formatCurrency(displayAmount);
}
```

Single line change — no other files affected.

