

## Fix Bill Payment: Data Repair + Credit Calculation + Consolidated Payment View

### Problem Summary

Three issues need fixing:

1. **Credit remaining balance formula** in `useBills.ts` calculates wrong remaining credit, causing over-allocation
2. **Paid tab credit distribution** in `BillsApprovalTable.tsx` attributes all credits to every bill instead of proportionally
3. **Missing consolidated payment view** — the Paid tab shows individual bill rows but doesn't show the actual payment amount or the bills that made up that payment (like QuickBooks does in the screenshot)

### Changes

**1. Fix credit remaining balance in `useBills.ts` (~line 417)**

The formula `total_amount - amount_paid` is wrong for credits. Fix:
```
credits: total_amount + amount_paid  (e.g., -500 + 350 = -150 remaining)
bills:   total_amount - amount_paid  (unchanged)
```

**2. Fix proportional credit distribution in `BillsApprovalTable.tsx` (lines 356-386)**

Currently every bill in a payment gets the full credit amount. Fix: distribute credits proportionally based on each bill's share of positive allocations in the payment.

**3. Add consolidated payment grouping on the Paid tab**

Instead of showing each bill as a standalone row, group bills by their `bill_payment_id`. The display will work like the QuickBooks screenshot:

- **Payment row** (parent): Shows vendor, payment date, total cash paid (e.g., $50.00), expandable
- **Bill detail rows** (children, shown on expand): Show each bill and credit in the payment with Ref No., Bill Amount, and Amount Paid

For payments with a single bill and no credits, the row looks exactly as it does today (no expand). For consolidated payments (multiple bills or bills + credits), clicking the row or an expand chevron reveals the component transactions.

This will be implemented by:
- Querying `bill_payment_allocations` grouped by `bill_payment_id` to build payment groups
- Rendering a collapsible parent row per payment with a chevron toggle
- Child rows indented slightly showing: Ref No., Bill Amount, Credit Applied, Amount Paid
- The parent row shows the `bill_payments.total_amount` (actual cash disbursed)

**4. Data repair via SQL migration**

Fix the two corrupted payments involving credit OCH-02302:
- Payment `5eac23ed`: credit allocation -500 → -350, total_amount -150 → 0
- Payment `c5b31abb`: credit allocation → -150, total_amount → 50
- Credit OCH-02302: amount_paid 550 → 500

### Files Modified
- `src/hooks/useBills.ts` — Fix remaining balance formula for credits
- `src/components/bills/BillsApprovalTable.tsx` — Proportional credit distribution + consolidated payment grouping on Paid tab
- New SQL migration — Data repair

