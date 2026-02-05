
# Partial Credit Application: Preserve Remaining Credit Balance

## Problem Summary

When you applied a **$500 credit** to a **$350 bill**, the system:
1. Correctly computed the net payment as **-$150** (credit exceeded bill)
2. Correctly created the `bill_payment` record with the allocation showing $500 credit and $350 bill
3. **Incorrectly** marked the credit's `amount_paid = 500` (the full credit amount)
4. **Incorrectly** changed the credit status to `'paid'`

The result: The remaining $150 of the credit is no longer visible or usable in the Approved tab because the credit bill has status `'paid'` and `amount_paid` equals the full credit amount.

---

## Root Cause

In `src/hooks/useBills.ts`, the `payMultipleBills` mutation processes each bill independently and:
- For credits (negative `total_amount`), it computes `remainingBalance = total_amount - amount_paid`
- It then sets `newAmountPaid = amount_paid + |remainingBalance|` (the full remaining credit)
- It marks the bill as `'paid'` when `newAmountPaid >= total_amount`

The logic doesn't account for **cross-application** scenarios where a credit only partially offsets a bill.

---

## Solution Approach

### Part 1: Fix the Payment Logic (Core Fix)

When paying multiple bills together (bills + credits), we need to:

1. **Calculate the net payment first** - sum all selected bills and credits to determine the actual net amount
2. **Apply credits proportionally or up to the bill amounts** - only "consume" as much credit as is needed to pay the bills
3. **Track remaining credit balance** - update the credit's `amount_paid` only by the amount actually applied

**Key change in `src/hooks/useBills.ts` (`payMultipleBills` mutation):**

```text
Current Logic:
- Process each bill independently
- For credits: amount_paid += |full_remaining_credit|
- Mark as paid if fully consumed

New Logic:
- Group bills and credits together
- Calculate net: sum(bill_amounts) + sum(credit_amounts)  
- For credits: only consume what's needed to offset bills
- Remaining credit stays with status='posted' and reduced amount_paid
```

### Part 2: UI Enhancement (Visibility)

Add an "Available Credits" indicator in the Bill Payment view that:
1. Shows credits with remaining balance (`total_amount < 0` AND `status = 'posted'`)
2. Displays the remaining credit amount: `|total_amount| - amount_paid`
3. Allows users to select credits along with bills for consolidated payment

**Files to modify:**
- `src/components/bills/PayBillsTable.tsx` - Add section showing available credits
- `src/components/PayBillDialog.tsx` - Show credit breakdown when credits are included

---

## Implementation Steps

### Step 1: Update `payMultipleBills` in `src/hooks/useBills.ts`

Modify the mutation to handle credit application intelligently:

```typescript
// Calculate totals
const regularBillTotal = results
  .filter(r => r.amountPaid > 0)
  .reduce((sum, r) => sum + r.amountPaid, 0);

const creditTotal = results
  .filter(r => r.amountPaid < 0)
  .reduce((sum, r) => sum + Math.abs(r.amountPaid), 0);

// For credits, only apply up to the bill total
const creditToApply = Math.min(creditTotal, regularBillTotal);
const remainingCredit = creditTotal - creditToApply;

// Update credit bills with partial application
for (const result of results.filter(r => r.amountPaid < 0)) {
  // Calculate proportional credit usage
  const creditAmount = Math.abs(result.amountPaid);
  const proportionalUsage = creditToApply * (creditAmount / creditTotal);
  
  // Update the credit bill with actual amount used
  await supabase
    .from('bills')
    .update({
      amount_paid: (bill.amount_paid || 0) + proportionalUsage,
      status: (proportionalUsage >= creditAmount) ? 'paid' : 'posted'
    })
    .eq('id', result.billId);
}
```

### Step 2: Enhance PayBillsTable Query

Update the query in `src/components/bills/PayBillsTable.tsx` to include credits with remaining balance:

```typescript
// Current: only fetches status='posted' with positive balance
// New: also fetch credits (negative total_amount) with remaining balance

// After fetching posted bills, also get available credits
const creditsQuery = supabase
  .from('bills')
  .select(/* same fields */)
  .eq('status', 'posted')
  .eq('is_reversal', false)
  .lt('total_amount', 0);  // Credits only

// Combine and distinguish in UI
```

### Step 3: Add Credit Balance Display

In `PayBillsTable.tsx`, add visual distinction for credits:
- Show credits in a separate section or with a "CR" badge
- Display "Remaining: $X" for credits that have been partially used
- Allow selection together with bills for consolidated payment

### Step 4: Update PayBillDialog for Credit Visibility

When credits are part of the selected bills:
- Show breakdown: "Bills: $350, Credits Applied: -$350, Net: $0"
- If credit exceeds bills: "Remaining credit: $150 will stay available"

---

## Data Fix (For Existing Transactions)

For the specific transaction you mentioned (JZ Structural - $500 credit, $350 bill):

The credit bill `6b518b88-f4c7-4718-98d2-a77ed1f5a5b5` should be corrected:

```sql
-- Fix the credit to show $150 remaining ($500 - $350 used)
UPDATE bills 
SET 
  amount_paid = 350,  -- Only $350 was actually applied
  status = 'posted'   -- Still has remaining balance
WHERE id = '6b518b88-f4c7-4718-98d2-a77ed1f5a5b5';
```

After this fix, the credit will appear in the Approved tab with $150 remaining to apply.

---

## Affected Files

| File | Changes |
|------|---------|
| `src/hooks/useBills.ts` | Update `payMultipleBills` to handle partial credit application |
| `src/components/bills/PayBillsTable.tsx` | Include credits with remaining balance in query; add visual distinction |
| `src/components/PayBillDialog.tsx` | Show credit application breakdown and remaining balance preview |

---

## Testing Checklist

After implementation:
1. ☐ Apply a $500 credit to a $350 bill → Credit should show $150 remaining
2. ☐ Remaining credit appears in Approved tab with status "posted"
3. ☐ Apply remaining $150 credit to another bill → Credit status changes to "paid"
4. ☐ Net payment journal entry shows correct $-150 (or $0 depending on workflow)
5. ☐ Existing bills/credits with no remaining balance still work correctly
