

## Fix: Calendar dropdown should open to the selected "As of" date month

### Problem
When clicking the "As of October 31st, 2025" date picker, the calendar opens to March 2026 (today) instead of October 2025. This is because the `Calendar` component lacks the `defaultMonth` prop.

### Solution
Add `defaultMonth={asOfDate}` to every `<Calendar>` instance in the four report content files. This is the same pattern already used in `ReconcileAccountsContent.tsx` and `InlineEditCell.tsx`.

### Files to change
1. **`src/components/reports/AccountsPayableContent.tsx`** — 2 Calendar instances
2. **`src/components/reports/BalanceSheetContent.tsx`** — 2 Calendar instances
3. **`src/components/reports/IncomeStatementContent.tsx`** — 2 Calendar instances
4. **`src/components/reports/JobCostsContent.tsx`** — 2 Calendar instances

### Change (identical in all 8 instances)
Add `defaultMonth={asOfDate}` to each `<Calendar>` component:
```tsx
<Calendar
  mode="single"
  selected={asOfDate}
  defaultMonth={asOfDate}  // ← add this line
  onSelect={(date) => date && onAsOfDateChange(date)}
  initialFocus
  className="pointer-events-auto"
/>
```

