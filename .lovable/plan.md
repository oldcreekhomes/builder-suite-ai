
## Fix: Consolidated Bill Payments Not Showing as Single Row

### Problem Summary
When you pay multiple bills together (3 checks totaling $5,826.49), the bank register shows 3 separate "Bill Pmt - Check" rows instead of a single consolidated row with a "+2" tooltip. This happens because the payment flow does NOT create the `bill_payments` record that the display logic needs.

### Root Cause
The `PayBillsTable` component uses `payMultipleBills` from `useBills.ts`, which:
- Creates individual journal entries for each bill
- Updates each bill's status to 'paid'
- **Never creates the `bill_payments` or `bill_payment_allocations` records**

The `AccountDetailDialog` consolidation logic (that I just implemented) looks for `bill_payments` records to group payments. Since none exist, there's nothing to consolidate.

### Solution
Modify `payMultipleBills` in `src/hooks/useBills.ts` to also create the consolidated payment records when paying multiple bills from the same vendor:

| Step | What Happens |
|------|--------------|
| 1 | Group bills by vendor_id |
| 2 | For each vendor group, create a `bill_payments` record with the total amount |
| 3 | Create `bill_payment_allocations` linking each bill to the payment |
| 4 | Continue creating journal entries as before (for ledger accuracy) |

### Technical Details

**File:** `src/hooks/useBills.ts` (lines 373-520)

**Changes to `payMultipleBills` mutation:**

1. After processing all bills successfully, group them by `vendor_id` and `project_id`

2. For each vendor/project group, create a consolidated `bill_payments` record:
```typescript
const { data: billPayment } = await supabase
  .from('bill_payments')
  .insert({
    owner_id: ownerId,
    payment_date: paymentDate,
    payment_account_id: paymentAccountId,
    vendor_id: vendorId,
    project_id: projectId,
    total_amount: groupTotalAmount,
    memo: memo || null,
    created_by: user.id
  })
  .select()
  .single();
```

3. Create `bill_payment_allocations` for each bill in the group:
```typescript
const allocations = billsInGroup.map(bill => ({
  bill_payment_id: billPayment.id,
  bill_id: bill.id,
  amount_allocated: bill.remainingBalance
}));

await supabase
  .from('bill_payment_allocations')
  .insert(allocations);
```

4. Invalidate relevant query caches after success

### Backfill for Existing Data
The 01/28/2026 payment you just made needs a backfill. I'll create a `bill_payments` record for the 3 Old Creek Homes bills paid together, along with their allocations. This is a one-time data fix.

**Data to create:**
| Table | Data |
|-------|------|
| `bill_payments` | vendor: Old Creek Homes, date: 2026-01-28, amount: $5,826.00, account: Sandy Spring Bank |
| `bill_payment_allocations` | 3 rows linking to bills: $100 + $776 + $4,950 |

### Files to Modify
1. `src/hooks/useBills.ts` - Add consolidated payment creation to `payMultipleBills`
2. Database - One-time backfill for the 01/28/2026 payment

### Result After Fix
- Future multi-bill payments will automatically create consolidated records
- Bank register will show single "Bill Pmt - Check" row with "+N" tooltip
- Reconciliation will match bank statement (one cleared amount)
- Existing 01/28/2026 payment will be backfilled and display correctly
