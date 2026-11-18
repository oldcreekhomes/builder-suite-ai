# Count every bill that isn't due yet as "Current"

Right now "Current" on the Accounting dashboard only counts bills waiting for approval. Approved bills, like the 5 at 6119 11th St and the 4 at 1639 N Woodstock, never show up there.

Change:
- "Current" will count every bill that isn't due yet: bills waiting for approval, rejected bills, and approved bills that haven't been paid.
- Paid at Purchase bills and archived bills stay out of the count, the same as they are today.
- Late, Rejected and Pay stay the same.

Expected after the change: 6119 shows 5 and 1639 N Woodstock shows 4.

## Technical details
- `src/lib/billIssues.ts` `isCurrentBill`: count `draft`, `void` and `posted` statuses (skip archived and paid-at-purchase bills), and only when the due date is missing or today or later.
- The only caller is `useBillCountsByProject.ts`, which already loads those three statuses.
- Add a small test for the new rule.
