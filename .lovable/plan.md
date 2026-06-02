I found the issue in the Paid tab UI display logic — the database has the correct accounting records, but the table is rendering them as two separate payment rows:

- Cash payment record: `$28,244.90` applied to the `$30,749.66` bill
- Credit application record: `$0.00` group containing the `$2,504.76` credit memo and the same bill

That is why the screen now shows a duplicate standalone `$28,244.90` row and a separate `$0.00` payment group. The UI needs to merge those into one paid-bill settlement display.

Plan:

1. **Replace the Paid tab grouping rule for mixed cash + credit settlements**
   - Group paid rows by the target bill being settled, not by each `bill_payments` row when a bill has both cash and credit allocations.
   - For OW, the `$28,244.90` cash payment and `$2,504.76` credit application will become one display group.

2. **Suppress the duplicate standalone cash row**
   - The invoice `2006163907-001` should not render once as an individual `$28,244.90` row and again inside the credit application group.
   - It should render once as the parent settlement group.

3. **Show the correct payment amount on the parent group**
   - Parent amount should be actual cash paid: `$28,244.90`.
   - It should not show `$0.00` just because the credit application record nets to zero.

4. **Show the expanded details clearly**
   - Expanded rows should show:
     - Bill: `$30,749.66`
     - Credit Memo: `($2,504.76)`
   - Tooltip/detail should show:
     - Bill Amount: `$30,749.66`
     - Credit Applied: `$2,504.76`
     - Cash Paid: `$28,244.90`
     - Balance: `$0.00`

5. **Validate against the OW data**
   - Confirm the Paid tab no longer shows two separate OW payment rows.
   - Confirm the parent row amount is `$28,244.90`, not `$0.00`.
   - Confirm the bill still shows fully paid and locked/read-only as expected.