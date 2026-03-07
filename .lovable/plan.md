

## Show Payment Breakdown on the Paid Bills Tab

### Problem
The Paid tab's Amount column shows only `total_amount` (e.g., $200), giving no indication that a credit was applied. In the user's case, a $200 bill was paid using a $150 credit, meaning only $50 was actually disbursed -- but the table gives no visibility into this.

### Solution
Add a **"Paid"** column to the Paid tab that shows the net cash paid, with a tooltip breakdown when credits were involved. This keeps the Amount column as-is (the bill face value) while adding clarity on actual payment.

### Technical Approach

**1. Fetch payment allocation data for paid bills**

In `BillsApprovalTable.tsx`, when `status === 'paid'`, run a secondary query to fetch `bill_payment_allocations` for all displayed bill IDs. This gives us which `bill_payment_id` each bill belongs to. Then for each payment, fetch sibling allocations to identify credits applied.

Specifically:
- Query `bill_payment_allocations` for all displayed bill IDs to get `bill_payment_id` and `amount_allocated`
- Query `bill_payments` for those payment IDs to get `total_amount` (the actual cash disbursed)
- Query sibling allocations to identify credits in the same payment group

**2. Add a "Paid" column (visible only on the Paid tab)**

Between the Amount column and the Reference column, show:
- **Net paid amount** (cash actually disbursed for this bill)
- When credits were involved, show a tooltip with the breakdown:
  ```
  Bill Amount:    $200.00
  Credit Applied: -$150.00 (OCH-02302)
  Cash Paid:       $50.00
  ```
- Use a small info icon or the green CR badge to indicate credits were involved

**3. Files to modify**

- **`src/components/bills/BillsApprovalTable.tsx`**:
  - Add a `useQuery` that fetches payment allocation data when status is `'paid'`
  - Add a `TableHead` for "Paid" column, conditionally rendered for paid status
  - Add a `TableCell` that shows the net payment with tooltip breakdown
  - Add the column to `baseColCount` when on the paid tab

### Data Flow

```text
bill_payment_allocations (bill_id = this bill)
  → bill_payment_id
    → bill_payments.total_amount (total cash for the grouped payment)
    → sibling bill_payment_allocations (same payment_id)
      → identify credits (bills with negative total_amount)
```

### UI Behavior
- Bills paid without credits: "Paid" column shows same value as Amount (e.g., "$200.00")
- Bills paid with credits: "Paid" column shows net cash (e.g., "$50.00") with an info icon; hovering shows the credit breakdown with reference numbers
- Credit memo rows themselves: "Paid" column shows "-" or the applied amount

