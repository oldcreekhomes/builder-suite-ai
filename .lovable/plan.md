

## Investigation Summary

I traced the "Delete Bill" flow on the Approved tab through `PayBillsTable.tsx`. The delete action exists (line 1150-1159) and is visible when `canDeleteBills` is true (which it is, based on your screenshot). However, the action has this guard:

```
disabled: isDateLocked(bill.bill_date)
```

This disables the delete button for any bill whose `bill_date` falls on or before your latest closed accounting period. Looking at your Approved tab, all 11 bills have dates from July 2025 through November 2025. If you have a closed accounting period covering any of those months, those delete buttons will appear in the menu but be non-clickable (disabled/grayed).

## Fix

Remove the `isDateLocked` guard from the Delete Bill action on the Approved tab. The `delete_bill_with_journal_entries` database function already has its own safeguard — it blocks deletion of reconciled bills. For unreconciled approved bills, hard-deleting is safe because both the bill and its journal entries are removed together, keeping the ledger balanced.

### File: `src/components/bills/PayBillsTable.tsx`
- Line 1157: Remove `disabled: isDateLocked(bill.bill_date)` from the Delete Bill action, so the only gate is the `canDeleteBills` permission and the DB-level reconciliation check.

This is a one-line change. The reconciliation guard in the database function remains the true safety net — if a bill has been reconciled, the RPC will throw an error and the UI will show a toast.

