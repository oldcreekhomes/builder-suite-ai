

## Fix: Credit Application Should Not Touch Cash Account

### Problem
When paying bills with credits applied, the system creates **incorrect journal entries**:

1. **Regular bill JE**: Debits A/P for full bill amount ($750), Credits Cash for full amount ($750)
2. **Credit application JE**: Credits A/P ($500), **Debits Cash ($500)** ← WRONG

This results in a net $0 cash impact when it should be -$250. The cash account ends up $150 (or $500 in the example) off from the bank.

### Correct Accounting
For a $750 bill paid with a $500 credit:
- **Bill payment**: Debit A/P $750, Credit Cash **$250**, offset from credit $500
- **Credit application**: Debit A/P $500 (consume the credit), Credit A/P $500 (reduce the bill's payable) — **no cash involved**

### Solution
Restructure the `payMultipleBills` mutation in `useBills.ts` to:

1. **Credit application JE** (lines 584-607): Remove the cash account entirely. Instead, the journal entry should be:
   - Debit A/P (the credit memo's balance — consuming the credit)
   - Credit A/P is already handled implicitly since the credit was originally booked as a negative A/P entry. So this entry just needs to **debit A/P** to zero out the credit. The offsetting credit should go to A/P as well (netting the credit against the bill). Actually, since the original credit memo already created a credit to A/P when posted, applying it just needs: **Debit A/P $500** (wipe out the credit balance) — no second line needed against cash.

   Simplified: change the credit application JE from `debit Cash / credit A/P` to `debit A/P / credit A/P` — this is an internal A/P offset that doesn't touch cash.

2. **Regular bill payment JE** (lines 493-514): Reduce the cash credit by the proportional credit amount applied. The payment amount credited to cash should be `bill.remainingBalance - creditPortionAppliedToThisBill`, not the full remaining balance.

### Implementation Detail

**`src/hooks/useBills.ts` — `payMultipleBills` mutation**

**Step A**: Calculate per-bill credit allocation before processing bills. Distribute `creditToApply` proportionally across regular bills.

**Step B**: For each regular bill's journal entry (lines 493-514):
- Line 1 (Debit A/P): Keep at full `paymentAmount` (the bill is fully settled)
- Line 2 (Credit Cash): Change from `paymentAmount` to `paymentAmount - creditAllocatedToThisBill` (only the cash portion)
- Add Line 3 (if credit allocated > 0): No extra line needed — the credit application JE handles the other side

**Step C**: For credit application JE (lines 584-607):
- Line 1: **Credit A/P** `creditAmountToApply` (reduce the credit balance in A/P) — keep as-is
- Line 2: Change from **Debit Cash** to **Debit A/P** `creditAmountToApply` — this offsets the bill's A/P, not cash

Wait — that would double-debit A/P. Let me reconsider the proper double-entry:

**Original credit memo posting** (when credit was first recorded):
- Debit A/P $500 (reduce what we owe)
- Credit Expense $500 (reduce expense)

**Paying $750 bill with $500 credit applied:**
- Net cash needed: $250
- JE for the bill payment: Debit A/P $750, Credit Cash $250, Credit... we need $500 more credit somewhere

The cleanest fix: **Don't create separate JEs for credits**. Instead, modify the bill payment JE to include the credit offset:
- Debit A/P $750 (settle the bill)
- Credit Cash $250 (actual cash out)  
- Credit A/P $500 (apply the credit — this reverses the credit's A/P debit balance)

But this requires restructuring to combine bills and credits into unified JEs. That's a bigger change.

**Simpler fix** keeping separate JEs:
- **Bill payment JE**: Debit A/P $750, Credit Cash $750 (unchanged — records full settlement)
- **Credit application JE**: Change lines to: **Credit A/P** $500, **Debit Cash** $500 → change to **Debit A/P** $500 (no, this is wrong too)

Actually, the simplest correct approach:

The regular bill JE should only credit cash for the **net amount** going out. The credit portion offsets A/P internally.

**Bill payment JE** (for the $750 bill, with $500 credit applied):
- Debit A/P $750
- Credit Cash $250
- Credit A/P $500 ← this "uses" the credit

**Credit application**: Just update the credit bill's `amount_paid` — no separate JE needed since the A/P credit line above handles it.

### Revised Plan

**File: `src/hooks/useBills.ts`**

1. **Before processing regular bills**: Calculate how much credit is allocated to each bill proportionally.

2. **Regular bill JE** (~line 493): 
   - Keep Debit A/P at full `paymentAmount`
   - Change Credit Cash to `paymentAmount - creditPortionForThisBill`
   - Add a third line: Credit A/P for `creditPortionForThisBill` (this consumes the credit)
   - Skip the cash line entirely if creditPortion equals the full payment (pure credit application)

3. **Credit application section** (~lines 554-651):
   - Remove the journal entry creation entirely (lines 570-613) — the credit offset is now handled in the bill's JE
   - Keep the credit bill update logic (lines 617-651) to update `amount_paid` and `status`

4. **Consolidated bill_payments** (~lines 657-717):
   - Update `totalAmount` to reflect net cash amount (excluding credit offsets)

### Files Changed
- `src/hooks/useBills.ts` — restructure `payMultipleBills` mutation

### Existing Data Fix
The user mentioned a specific $150 discrepancy on the 923 17th Street project. After the code fix, we'll need a database migration to correct the existing incorrect journal entries (reverse the erroneous cash debit from the credit application and fix the amounts).

