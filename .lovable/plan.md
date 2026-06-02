I checked the OW/ABC records and the database now has the right accounting data:

- The original bill is **$30,749.66**.
- The cash payment is present: **$28,244.90 on 04/14/26**.
- The credit memo is present: **$2,504.76 on 05/15/26**.
- Job Costs are correct because the journal entries are correct.

The remaining issue is the **Paid tab UI grouping**, not the GL/job-cost data. A bill can now have more than one payment/allocation record, and the Paid tab is overwriting the cash payment group with the later $0 credit-application group. That is why the expanded row shows the bill as **$2,504.76** instead of showing the full bill/payment story.

Plan to fix:

1. **Change Paid tab grouping logic**
   - Stop mapping each bill to only one payment group.
   - Allow the paid bill to appear under the correct cash payment row and prevent the later credit-only allocation from replacing it.

2. **Display credit applications correctly**
   - For payment groups with `total_amount = 0` and both a credit memo + bill allocation, label them as a credit application instead of making them look like a normal bill payment.
   - Show the credit memo as the applied credit, not as a misleading standalone bill total.

3. **Fix the amount shown in expanded rows**
   - For child bill rows, show the actual bill amount when appropriate and show the allocation/payment amount only as payment detail.
   - For this case, the Paid tab should communicate: **Bill $30,749.66, Cash Paid $28,244.90, Credit Applied $2,504.76, Balance $0.00**.

4. **Prevent recurrence in the UI**
   - Add cent-precise helpers for paid-tab grouping so partial payments + credit applications do not overwrite each other.
   - Keep the existing journal-entry and backfilled `bill_payments` data unchanged because it is already correct.