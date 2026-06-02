## Root cause

The "Delete Bill" action calls the `delete_bill_with_journal_entries` RPC. The RPC cleans up `bill_lines`, `bill_attachments`, and `journal_entries`/`journal_entry_lines` — but it does **not** touch `bill_payment_allocations` or `bill_payments`.

The two duplicate USPS bills both have `status = 'paid'` and a row in `bill_payment_allocations`:

- `03052026` — $18.24, 1 allocation
- `10032024` — $2.79, 1 allocation

Because `bill_payment_allocations.bill_id` has a FK to `bills(id)` with **no cascade**, the final `DELETE FROM bills` throws a foreign-key violation. The RPC returns the error, and the hook swallows it into the generic toast "Failed to delete bill" — which is what Jole sees. Matt would hit the exact same error on these bills; he just hasn't tried these specific ones (his previous deletes were on un-paid bills).

This is not a permissions problem. Jole's `can_delete_bills` is correctly ON.

## Plan

### 1. Surface the real error in the UI

In `src/hooks/useBills.ts`, change the `deleteBill` `onError` toast from the hard-coded `"Failed to delete bill"` to use `error.message` (with a fallback). That way future blockers (reconciled payment, FK violation, etc.) are visible instead of silently generic.

### 2. Give a clear, actionable error when a bill has payments

Add a guard at the top of the `delete_bill_with_journal_entries` Postgres function (via migration) that raises a friendly exception when `bill_payment_allocations` rows exist for the bill:

```text
Cannot delete this bill because it has a recorded payment.
Void or delete the payment first, then delete the bill.
```

Combined with step 1, Jole (and Matt) will see exactly that message in the toast instead of "Failed to delete bill".

### 3. Do NOT auto-cascade payments

We will not have the delete RPC silently wipe `bill_payment_allocations` / `bill_payments` rows. Those represent real cash movement (checks written, journal entries on the bank side). Auto-deleting them would silently break bank reconciliation and double-entry integrity. The user must explicitly void/delete the payment first — same workflow QuickBooks uses.

### Files touched

- `src/hooks/useBills.ts` — `deleteBill.onError` toast description.
- One migration — replace `public.delete_bill_with_journal_entries(uuid)` with the new guard at the top.

### What Jole / Matt do next for the USPS duplicates

1. Open the bill payment for the duplicate USPS bill (Transactions → Bill Payments, or from the bill detail).
2. Void or delete that payment (which reverses the bank-side journal entry).
3. Then "Delete Bill" on the now-unpaid duplicate will succeed.
