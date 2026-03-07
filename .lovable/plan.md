

## Fix Floating-Point Rounding Error in Bill Totals

### Problem
When two job cost line items have amounts like $8.48 and $8.49, the "Job Cost Total" displays $16.98 instead of the correct $16.97. This is caused by floating-point arithmetic — `quantity * amount` for each row produces tiny fractional errors that accumulate when summed without rounding.

### Fix
Round each row's `quantity * amount` to the nearest cent **before** adding it to the running total. This is done by replacing `total + q * c` with `total + Math.round(q * c * 100) / 100` in every reduce callback that computes totals.

### Files to Change

**`src/components/bills/EditBillDialog.tsx`**
- Lines 903-920 (Job Cost Total — 3 identical reduce callbacks for label, color, and value): round each row contribution to cents
- Lines 1037-1053 (Expense Total — same 3 reduce pattern): same fix
- Lines 1117-1121 (BillNotesDialog amount): same fix

**`src/components/bills/ManualBillEntry.tsx`**
- Lines 941-955 (Job Cost Total — same repeated reduce pattern): same fix

**`src/components/bills/BatchBillLineItems.tsx`**
- Line 86-87 (jobCostTotal/expenseTotal): round each line amount to cents before summing

**`src/pages/WriteChecks.tsx`** and **`src/components/transactions/WriteChecksContent.tsx`**
- Their `calculateTotal` functions: same cent-rounding fix

**`src/components/bills/BillsApprovalTable.tsx`** (line 1028) and **`src/components/bills/PayBillsTable.tsx`** (line 1149)
- Table footer totals summing `bill.total_amount`: apply `Math.round(sum * 100) / 100` to the final result

### Pattern
```typescript
// Before (floating-point error prone)
return total + q * c;

// After (cent-precise)
return total + Math.round(q * c * 100) / 100;
```

