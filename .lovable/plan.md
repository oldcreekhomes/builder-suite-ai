

## Reverse March 7 Payment: Bill 260056 + Credit OCH-02302

### What Happened
On March 7, the system paid bill 260056 ($200) and applied credit OCH-02302 ($200 of the $500 credit). But the credit application used $200 instead of $150, which is wrong. The data needs to be reversed so you can re-pay correctly.

### Data to Reverse

**Two journal entries** from March 7:
1. `422fa361` — "Payment for bill - Ref: 260056" (Debit AP $200, Credit Bank $200)
2. `dd02eeca` — "Credit applied - Ref: OCH-02302" (Credit AP $200, Debit Bank $200)

**One bill_payment record**: `857bc827` with two allocations ($200 for 260056, -$200 for credit)

### Steps (all via SQL insert tool)

1. **Reverse journal entry `422fa361`** using existing `reverse_bill_payment` RPC — this reverses the JE and sets bill 260056 back to `amount_paid=0, status=posted`

2. **Reverse journal entry `dd02eeca`** using the same RPC — this reverses the credit application JE and reduces credit OCH-02302's `amount_paid` by 200 (from 550 to 350)

3. **Fix credit OCH-02302 status**: After step 2, amount_paid=350 but total_amount=-500, so remaining=$150 still available. Set status back to `posted`.

4. **Delete bill_payment `857bc827`** and its allocations (cascade delete handles allocations)

### Result After Reversal
- Bill 260056: status=posted, amount_paid=0 (back in Approved tab, ready to pay)
- Credit OCH-02302: status=posted, amount_paid=350 ($150 remaining credit available)
- Journal entries reversed with proper audit trail
- Bill payment record removed

