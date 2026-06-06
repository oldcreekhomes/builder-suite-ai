## Plan

1. **Fix the lookup for Bill Pmt - Check rows**
   - Update `TransactionDetailDialog` so `bill_payment` rows first treat `transaction.source_id` as the original bill id, because the register rows shown in your screenshots are built that way.
   - Also keep a fallback lookup through `bill_payment_allocations` when the source id is truly a bill payment id.

2. **Keep consolidated bill payments working**
   - For `consolidated_bill_payment`, use the included allocation data’s `bill_id` values directly.
   - If those are missing, fall back to resolving via `bill_payment_allocations`.

3. **Relabel the section for payment rows**
   - For `bill_payment` and `consolidated_bill_payment`, change the bottom section title from **Attachments** to **Original Bill**.
   - If none are found, show **No original bill found** instead of **No attachments found**.
   - Other transaction types keep the existing **Attachments** label.

4. **Verify with the reported examples**
   - Confirm the database has original bill attachments for the three shown payments:
     - Torres Moreno Remodeling, LLC — `126-126-longview-alexandria-va.pdf`
     - ConApp Metro — `OCH #16130.pdf`
     - An Exterior, Inc. — `Invoice # C26040 (1).PDF`
   - The dialog should list those files and continue opening them in the right-side preview panel via the existing bill attachment preview flow.

## Technical note

The previous change did not work for these rows because their `journal_entries.source_id` is the **bill id**, not the **bill payment id**. The attempted allocation lookup queried `bill_payment_allocations.bill_payment_id = source_id`, so it returned nothing. The fix is to resolve bill ids using both shapes: direct bill id first for `bill_payment`, allocation mapping for true payment ids/consolidated rows.