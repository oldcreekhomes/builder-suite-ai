Plan:

1. Update the bill approval validation in `src/hooks/useBills.ts`
   - Stop rejecting bills where `total_amount === 0`.
   - Keep invalid/NaN protection.
   - Do not block negative totals, since bill credits are already supported by the posting logic.

2. Add a zero-dollar posting path in `postBill`
   - When the bill total is exactly `$0.00`, update the bill status to `posted` without creating a `journal_entries` record or `journal_entry_lines`.
   - Reason: the database requires each journal line to have a non-zero debit or credit, and a free invoice has no accounting impact.
   - Preserve notes and normal approval flow so the bill moves out of Review into Approved/Posted immediately.

3. Keep normal bills unchanged
   - Positive bills continue creating AP/WIP/expense journal entries.
   - Negative bill credits continue using the existing credit-posting logic.
   - Existing cache invalidation/refetch logic remains so the table/counts update after approval.

4. Verify
   - Confirm the zero-dollar Kempsville-style bill can be approved from the Review table.
   - Confirm it leaves Review and appears under Approved/posted status without the red `$0.00 bill` error.