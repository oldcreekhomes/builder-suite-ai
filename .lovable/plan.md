
# Fix Credit Display and Add Credit Usage History Dialog

## Problem Summary

1. **Wrong Amount Display**: The JZ Structural credit shows **($850.00)** instead of the correct **($150.00)** remaining
   - Current calculation: `total_amount - amount_paid` = `-500 - 350 = -850` (wrong)
   - Correct calculation for credits: remaining = `|total_amount| - amount_paid` = `500 - 350 = 150`

2. **No Credit History Visibility**: Users cannot see how/when a credit was applied when clicking on "($350.00 used)"

---

## Solution

### Part 1: Fix Amount Calculation for Credits

In `PayBillsTable.tsx`, the Amount column currently uses:
```typescript
bill.total_amount - (bill.amount_paid || 0)
```

For regular bills (positive `total_amount`), this works correctly.
For credits (negative `total_amount`), this produces incorrect results.

**Fix**: Change the calculation logic:
- For regular bills: remaining = `total_amount - amount_paid`
- For credits: remaining = `total_amount + amount_paid` (since `total_amount` is negative and `amount_paid` tracks how much has been "consumed")

The formula `total_amount + amount_paid` works because:
- Credit: `total_amount = -500`, `amount_paid = 350`
- Remaining: `-500 + 350 = -150` (correctly shows $150 remaining credit)

### Part 2: Create Credit Usage History Dialog

Create a new dialog component that:
1. Fetches `bill_payment_allocations` for the credit bill
2. Shows a table with:
   - Payment Date
   - Bill Applied To (reference number)
   - Amount Applied
   - Payment Method
3. Shows the original credit amount and remaining balance

---

## Technical Implementation

### File 1: `src/components/bills/PayBillsTable.tsx`

**Change 1** - Fix amount calculation (around line 977):
```typescript
// Current (wrong for credits):
formatCurrency(bill.total_amount - (bill.amount_paid || 0))

// Fixed (works for both bills and credits):
const remainingAmount = bill.total_amount < 0 
  ? bill.total_amount + (bill.amount_paid || 0)  // Credit: -500 + 350 = -150
  : bill.total_amount - (bill.amount_paid || 0); // Bill: normal subtraction
formatCurrency(remainingAmount)
```

**Change 2** - Make "($X used)" clickable to open dialog:
```typescript
{bill.total_amount < 0 && (bill.amount_paid || 0) > 0 && (
  <button
    className="text-xs text-muted-foreground hover:underline cursor-pointer"
    onClick={() => openCreditHistoryDialog(bill)}
  >
    (${Math.abs(bill.amount_paid || 0).toFixed(2)} used)
  </button>
)}
```

**Change 3** - Add state and import for the new dialog:
```typescript
const [creditHistoryDialog, setCreditHistoryDialog] = useState<{
  open: boolean;
  bill: BillForPayment | null;
}>({ open: false, bill: null });
```

### File 2: `src/components/bills/CreditUsageHistoryDialog.tsx` (New File)

Create a dialog that:
1. Takes a credit bill as prop
2. Queries `bill_payment_allocations` joined with `bill_payments` and related `bills`
3. Displays:
   - **Header**: Credit info (vendor, reference, original amount)
   - **Table**: 
     | Date | Applied To | Amount | Payment Method |
     |------|------------|--------|----------------|
     | 01/27/26 | Bill #251216 | $350.00 | Atlantic Union Bank |
   - **Footer**: 
     - Total Used: $350.00
     - Remaining: $150.00

---

## Files to Create/Modify

| File | Action |
|------|--------|
| `src/components/bills/PayBillsTable.tsx` | Fix amount calculation; add clickable credit usage link |
| `src/components/bills/CreditUsageHistoryDialog.tsx` | Create new dialog component |

---

## Expected Result

After implementation:
- JZ Structural credit will show **($150.00)** remaining (not $850)
- Clicking "($350.00 used)" opens a dialog showing:
  - Original credit: $500.00
  - Applied on 01/27/2026 to Bill #251216: $350.00
  - Remaining balance: $150.00
