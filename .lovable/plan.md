

## Fix: "Delete Bill" Disabled on Rejected Tab Despite Permission Being ON

### What's Actually Happening

The "Delete Invoices" permission toggle IS working — Jole's `can_delete_bills` is `true`, which is why the "Delete Bill" option appears in the menu. However, it's **grayed out/disabled** because of a date-lock guard: `disabled: isDateLocked(bill.bill_date) || bill.reconciled`.

The bill (Wire Gill, LLP, dated 12/08/25) falls within a closed accounting period, so `isDateLocked` returns `true`, making the button unclickable.

This same guard was previously removed for Approved bills (per your earlier request), but it was never removed for Void/Rejected bills. The database function `delete_bill_with_journal_entries` already blocks deletion of reconciled bills as the final safety net, so the frontend date-lock guard is redundant.

### Change

**File: `src/components/bills/BillsApprovalTable.tsx`** (lines 1031-1066)

Remove the `isDateLocked(bill.bill_date)` check from the `disabled` prop on both Delete Bill actions in the `canShowDeleteButton` column (the void/posted/paid section). Keep `bill.reconciled` as the only disable condition — matching what was already done for Approved bills.

Before:
```tsx
disabled: isDateLocked(bill.bill_date) || bill.reconciled,
```

After:
```tsx
disabled: bill.reconciled,
```

This applies to both the `showEditButton` path (line 1045) and the default path (line 1063).

### Why This Is Safe

The database function `delete_bill_with_journal_entries` already refuses to delete reconciled bills. The `isDateLocked` guard was an extra frontend restriction that prevents legitimate corrections — exactly the scenario described in your approved pattern for Approved bills.

